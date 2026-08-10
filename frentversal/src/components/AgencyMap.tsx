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

// 중개사무소 위치를 지도에 표시하는 컴포넌트.
//
// 카카오맵 SDK 는 index.html 에 아래 script 를 넣으면 window.kakao 로 들어옵니다.
//   <script src="//dapi.kakao.com/v2/maps/sdk.js?appkey=발급받은키&autoload=false"></script>
// 아직 키를 발급받기 전이라 SDK 가 없으면 안내 문구만 보여주고, 있으면 실제 지도를 그립니다.
// 그래서 나중에 script 한 줄만 추가하면 이 파일은 고치지 않아도 지도가 뜹니다.

declare global {
    interface Window {
        // 카카오맵 SDK 는 타입 정의(@types)가 따로 없어서 any 로 둡니다.
        // 정식으로 붙일 때 `npm i -D @types/kakaomaps` 같은 타입 패키지를 쓰면 이 선언은 지워도 됩니다.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        kakao?: any;
    }
}

interface Props {
    agencies: MapAgency[];
}

// 지도를 처음 띄울 때의 중심 좌표 (강남역). 목록에 좌표가 하나도 없을 때만 쓰입니다.
const DEFAULT_CENTER = { latitude: 37.4979, longitude: 127.0276 };

function AgencyMap({ agencies }: Props) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [sdkLoaded, setSdkLoaded] = useState(false);

    useEffect(() => {
        const kakao = window.kakao;
        const container = containerRef.current;

        // SDK 가 아직 없으면(키 발급 전) 지도를 그리지 않고 안내 문구를 그대로 둡니다.
        if (!kakao?.maps || !container) return;

        setSdkLoaded(true);

        // autoload=false 로 불러온 SDK 는 load() 안에서 지도를 만들어야 합니다.
        kakao.maps.load(() => {
            const map = new kakao.maps.Map(container, {
                center: new kakao.maps.LatLng(DEFAULT_CENTER.latitude, DEFAULT_CENTER.longitude),
                level: 6, // 숫자가 클수록 넓게 보입니다
            });

            // 마커를 모두 담을 수 있는 범위. 마지막에 이 범위에 맞춰 지도를 이동·확대합니다.
            const bounds = new kakao.maps.LatLngBounds();

            agencies.forEach((agency) => {
                // 좌표가 없는 사무소는 지도에 찍을 수 없으므로 건너뜁니다.
                if (agency.latitude == null || agency.longitude == null) return;

                const position = new kakao.maps.LatLng(agency.latitude, agency.longitude);
                const marker = new kakao.maps.Marker({ map, position, title: agency.name });

                // 말풍선 내용은 문자열 대신 DOM 으로 만듭니다.
                // 사무소 이름에 <, > 같은 글자가 들어와도 HTML 로 해석되지 않게 하기 위함입니다.
                const bubble = document.createElement('div');
                bubble.style.padding = '7px 10px';
                bubble.style.fontSize = '12px';
                bubble.textContent = `${agency.name} (${agency.brokerName} 공인중개사)`;

                const infoWindow = new kakao.maps.InfoWindow({ content: bubble });

                kakao.maps.event.addListener(marker, 'click', () => infoWindow.open(map, marker));

                bounds.extend(position);
            });

            // 좌표가 하나라도 있으면 그 범위에 맞춰 지도를 맞춥니다.
            if (!bounds.isEmpty()) map.setBounds(bounds);
        });
    }, [agencies]);

    return (
        // 높이·배경은 responsive.css 의 .agency-map 에서 지정합니다 (화면 크기별로 높이가 달라집니다)
        <div className="surface agency-map">
            {/* 카카오맵이 이 div 안에 그려집니다 */}
            <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

            {!sdkLoaded && (
                <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center' }}>
                    <div>
                        <p className="xs dim">지도는 카카오맵 API 연동 후 표시됩니다.</p>
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
