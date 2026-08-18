/*
  카카오맵 SDK 를 내려받는 공용 함수.

  지도를 쓰는 화면이 둘 이상(중개사무소 안내, 지도 검색)이라 여기로 뺐다.
  화면마다 각자 스크립트를 넣으면 <script> 태그가 여러 번 붙고,
  동시에 열렸을 때 SDK 가 두 번 로드될 수 있다.

  SDK 를 index.html 이 아니라 코드에서 불러오는 이유:
    - index.html 은 팀원들이 함께 쓰는 공용 파일이라 건드리지 않는 편이 낫고,
    - 지도는 일부 화면에서만 쓰는데 모든 페이지에서 받아올 이유가 없다.
*/

declare global {
    interface Window {
        // 카카오맵 SDK 는 타입 정의(@types)가 따로 없어서 any 로 둔다.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        kakao?: any;
    }
}

// Vite 는 VITE_ 로 시작하는 값만 브라우저로 넘겨 준다.
// (그래서 여기 넣는 값은 브라우저에서 보인다. 노출되면 안 되는 REST API 키는 절대 넣지 말 것)
const KAKAO_APP_KEY = import.meta.env.VITE_KAKAO_MAP_KEY as string | undefined;

// SDK 를 두 번 이상 내려받지 않기 위해 진행 상태를 모듈 수준에 보관한다.
let sdkLoadingPromise: Promise<void> | null = null;

// 카카오맵 SDK 를 내려받는다. 이미 받아 두었으면 곧바로 끝난다.
export function loadKakaoSdk(): Promise<void> {
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
        //                  화면에서 kakao.maps.load() 로 직접 만들기 위한 설정이다.
        // libraries=services : 주소를 좌표로 바꾸는 기능(Geocoder)을 함께 받는다.
        //                      지도 검색을 열 때 회원이 사는 지역으로 화면을 맞추는 데 쓴다.
        script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_APP_KEY}&autoload=false&libraries=services`;
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

// 서울 25개 구의 경계선 좌표. 지도에서 "이 구가 여기다" 하고 강조 표시할 때 쓴다.
//
// 출처 : southkorea/seoul-maps (2015년 시군구 경계, 공개 데이터를 내려받아 이름·좌표만 추려 두었다).
// 카카오 지도 SDK 는 행정구역 경계를 기본으로 주지 않아서 별도 데이터가 필요했다.
// 좌표는 소수 5자리(약 1m 정밀도)로 반올림해 용량을 줄였다 — 경계 강조용이라 이 정도면 충분하다.
import districtBoundaries from '../assets/seoulDistricts.json';

interface DistrictBoundary {
    name: string;
    coordinates: number[][][]; // Polygon 좌표 (바깥 테두리 + 구멍이 있으면 안쪽 테두리)
}

// 이름으로 구 경계를 찾는다. "서초구"처럼 구까지만 와도, "서울시 서초구"처럼 앞에 시가 붙어도 찾는다.
export function findDistrictBoundary(name: string): DistrictBoundary | null {
    if (!name) return null;

    const found = (districtBoundaries as DistrictBoundary[])
        .find((district) => name.includes(district.name));

    return found ?? null;
}

// 주소 문자열을 지도 좌표로 바꾼다.
//
// 회원이 가입할 때 적은 주소로 지도 시작 위치를 맞추는 데 쓴다.
// 주소로 못 찾으면 장소 이름으로 한 번 더 찾아본다("신촌"처럼 주소가 아닌 값이 들어 있을 수 있다).
// 둘 다 실패하면 null 을 돌려주고, 화면은 기본 위치를 그대로 쓴다.
export function findCenter(address: string): Promise<{ latitude: number; longitude: number } | null> {
    return new Promise((resolve) => {
        const kakao = window.kakao;

        if (!address?.trim() || !kakao?.maps?.services) {
            resolve(null);
            return;
        }

        const toResult = (item: { x: string; y: string }) => ({
            latitude: Number(item.y),
            longitude: Number(item.x),
        });

        new kakao.maps.services.Geocoder().addressSearch(address, (result: any[], status: string) => {
            if (status === kakao.maps.services.Status.OK && result.length > 0) {
                resolve(toResult(result[0]));
                return;
            }

            // 주소로 못 찾으면 장소 검색으로 한 번 더
            new kakao.maps.services.Places().keywordSearch(address, (places: any[], placeStatus: string) => {
                if (placeStatus === kakao.maps.services.Status.OK && places.length > 0) {
                    resolve(toResult(places[0]));
                    return;
                }

                resolve(null);
            });
        });
    });
}
