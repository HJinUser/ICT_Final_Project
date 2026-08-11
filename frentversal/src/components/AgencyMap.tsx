import { useEffect, useRef, useState } from 'react';

// 목록 화면(AgencyResponse)과 상세 화면(AgencyDetail) 모두에서 쓸 수 있도록,
// 지도를 그리는 데 꼭 필요한 값만 요구한다.
export interface MapAgency {
    id: number;
    name: string;
    brokerName: string;
    latitude: number | null;
    longitude: number | null;
}

// 중개사무소 위치를 카카오맵에 표시하는 컴포넌트.
//
// 카카오맵 SDK 를 index.html 이 아니라 이 파일에서 직접 불러온다.
//   - index.html 은 팀원들이 함께 쓰는 공용 파일이라 건드리지 않는 편이 낫고,
//   - 지도는 중개사무소 화면에서만 쓰는데 모든 페이지에서 SDK 를 받아올 이유가 없기 때문이다.
//
// 키는 frentversal/.env 의 VITE_KAKAO_MAP_KEY 에서 읽는다. (.env 는 깃에 올라가지 않는다)
// 키가 없으면 지도를 그리지 않고 안내 문구만 보여 주므로, 키가 없는 팀원 환경에서도 화면이 깨지지 않는다.

declare global {
    interface Window {
        // 카카오맵 SDK 는 타입 정의(@types)가 따로 없어서 any 로 둔다.
        // 정식으로 타입 패키지를 설치하면 이 선언은 지워도 된다.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        kakao?: any;
    }
}

// Vite 는 VITE_ 로 시작하는 값만 브라우저로 넘겨 준다.
// (그래서 여기 넣는 값은 브라우저에서 보인다. 노출되면 안 되는 REST API 키는 절대 넣지 말 것)
const KAKAO_APP_KEY = import.meta.env.VITE_KAKAO_MAP_KEY as string | undefined;

// 지도를 처음 띄울 때의 중심 좌표 (강남역). 목록에 좌표가 하나도 없을 때만 쓰인다.
const DEFAULT_CENTER = { latitude: 37.4979, longitude: 127.0276 };

// SDK 를 두 번 이상 내려받지 않기 위해 진행 상태를 파일 수준에 보관한다.
// 지도가 있는 화면을 여러 번 오가도 <script> 태그는 한 번만 추가된다.
let sdkLoadingPromise: Promise<void> | null = null;

// 카카오맵 SDK 를 내려받는다. 이미 받아 두었으면 곧바로 끝난다.
function loadKakaoSdk(): Promise<void> {
    // 이미 불러온 경우
    if (window.kakao?.maps) return Promise.resolve();

    // 키가 없으면 부를 수 없다 (.env 를 만들지 않은 환경)
    if (!KAKAO_APP_KEY) {
        return Promise.reject(new Error('카카오맵 키(VITE_KAKAO_MAP_KEY)가 설정되지 않았습니다.'));
    }

    // 이미 내려받는 중이면 그 작업을 같이 기다린다
    if (sdkLoadingPromise) return sdkLoadingPromise;

    sdkLoadingPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');

        // autoload=false : 스크립트를 받자마자 지도를 만들지 않고,
        //                  아래에서 kakao.maps.load() 로 직접 만들기 위한 설정이다.
        script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_APP_KEY}&autoload=false`;
        script.async = true;

        script.onload = () => resolve();
        script.onerror = () => {
            // 실패하면 다음에 다시 시도할 수 있도록 기록을 지운다
            sdkLoadingPromise = null;
            reject(new Error('카카오맵 스크립트를 불러오지 못했습니다.'));
        };

        document.head.appendChild(script);
    });

    return sdkLoadingPromise;
}

interface Props {
    agencies: MapAgency[];
}

function AgencyMap({ agencies }: Props) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [sdkLoaded, setSdkLoaded] = useState(false);

    // 키가 없어서 지도를 못 그리는 것인지, 불러오다 실패한 것인지 안내하려고 담아 둔다
    const [loadError, setLoadError] = useState('');

    useEffect(() => {
        // 지도를 그리는 도중에 사용자가 다른 화면으로 옮겨갈 수 있다.
        // 그때 이미 사라진 화면에 그리려다 오류가 나지 않도록 표시해 둔다.
        let cancelled = false;

        loadKakaoSdk()
            .then(() => {
                if (cancelled) return;

                const kakao = window.kakao;
                const container = containerRef.current;

                if (!kakao?.maps || !container) return;

                // autoload=false 로 불러온 SDK 는 load() 안에서 지도를 만들어야 한다.
                kakao.maps.load(() => {
                    if (cancelled) return;

                    const map = new kakao.maps.Map(container, {
                        center: new kakao.maps.LatLng(DEFAULT_CENTER.latitude, DEFAULT_CENTER.longitude),
                        level: 6, // 숫자가 클수록 넓게 보인다
                    });

                    // 마커를 모두 담을 수 있는 범위. 마지막에 이 범위에 맞춰 지도를 이동·확대한다.
                    const bounds = new kakao.maps.LatLngBounds();

                    agencies.forEach((agency) => {
                        // 좌표가 없는 사무소는 지도에 찍을 수 없으므로 건너뛴다.
                        if (agency.latitude == null || agency.longitude == null) return;

                        const position = new kakao.maps.LatLng(agency.latitude, agency.longitude);
                        const marker = new kakao.maps.Marker({ map, position, title: agency.name });

                        // 말풍선 내용은 문자열 대신 DOM 으로 만든다.
                        // 사무소 이름에 <, > 같은 글자가 들어와도 HTML 로 해석되지 않게 하기 위함이다.
                        const bubble = document.createElement('div');
                        bubble.style.padding = '7px 10px';
                        bubble.style.fontSize = '12px';
                        bubble.textContent = `${agency.name} (${agency.brokerName} 공인중개사)`;

                        const infoWindow = new kakao.maps.InfoWindow({ content: bubble });

                        kakao.maps.event.addListener(marker, 'click', () => infoWindow.open(map, marker));

                        bounds.extend(position);
                    });

                    // 좌표가 하나라도 있으면 그 범위에 맞춰 지도를 맞춘다.
                    if (!bounds.isEmpty()) map.setBounds(bounds);

                    setSdkLoaded(true);
                });
            })
            .catch((error: Error) => {
                if (!cancelled) setLoadError(error.message);
            });

        return () => { cancelled = true; };
    }, [agencies]);

    return (
        // 높이·배경은 responsive.css 의 .agency-map 에서 지정한다 (화면 크기별로 높이가 달라진다)
        <div className="surface agency-map">
            {/* 카카오맵이 이 div 안에 그려진다 */}
            <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

            {/* 지도를 그리지 못했을 때만 안내 문구를 덮어 보여 준다 */}
            {!sdkLoaded && (
                <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center' }}>
                    <div>
                        <p className="xs dim">{loadError || '지도를 불러오는 중입니다…'}</p>
                        <p className="xs dim" style={{ marginTop: 6 }}>
                            표시 예정 위치 {agencies.filter((agency) => agency.latitude != null).length}곳
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AgencyMap;
