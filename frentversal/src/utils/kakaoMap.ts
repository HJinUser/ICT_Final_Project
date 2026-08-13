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
