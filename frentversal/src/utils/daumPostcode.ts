/*
  다음(카카오) 우편번호 서비스를 불러오고, 돌려받은 주소를 우리 표기로 정리하는 도구.

  왜 쓰는가:
    주소를 자유 입력으로 받으면 같은 곳을 "서울시 / 서울특별시 / 서울" 처럼 제각각 쓴다.
    그러면 지역으로 검색하거나 지도에서 묶을 때 맞지 않는다.
    검색해서 고르게 하면 사용자가 직접 타이핑할 수 없으므로 표기가 흔들릴 수 없다.

  이 서비스는 API 키가 필요 없고 무료다. 스크립트만 불러오면 팝업이 뜬다.
*/

declare global {
    interface Window {
        // 다음 우편번호 서비스는 타입 정의(@types)가 따로 없어서 any 로 둔다.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        daum?: any;
    }
}

const SCRIPT_URL = 'https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';

// 스크립트를 두 번 이상 내려받지 않기 위해 진행 상태를 모듈 수준에 보관한다.
let loadingPromise: Promise<void> | null = null;

export function loadDaumPostcode(): Promise<void> {
    if (window.daum?.Postcode) return Promise.resolve();

    if (loadingPromise) return loadingPromise;

    loadingPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');

        script.src = SCRIPT_URL;
        script.async = true;

        script.onload = () => resolve();
        script.onerror = () => {
            // 실패하면 다음에 다시 시도할 수 있도록 기록을 지운다
            loadingPromise = null;
            reject(new Error('주소 검색 서비스를 불러오지 못했습니다.'));
        };

        document.head.appendChild(script);
    });

    return loadingPromise;
}

// 다음 우편번호 서비스가 sido 를 "서울", "경기" 처럼 짧게 준다.
// 팀 규칙대로 "서울시 ○○구 ○○동" 형태가 되도록 뒤에 시/도를 붙여 준다.
// (특별시·광역시로 늘이지 않는다. "서울특별시"가 아니라 "서울시")
const SIDO_SUFFIX: Record<string, string> = {
    서울: '서울시',
    부산: '부산시',
    대구: '대구시',
    인천: '인천시',
    광주: '광주시',
    대전: '대전시',
    울산: '울산시',
    세종: '세종시',
    경기: '경기도',
    강원: '강원도',
    충북: '충청북도',
    충남: '충청남도',
    전북: '전라북도',
    전남: '전라남도',
    경북: '경상북도',
    경남: '경상남도',
    제주: '제주도',
};

export function normalizeSido(sido: string): string {
    return SIDO_SUFFIX[sido] ?? sido;
}

// 화면과 서버가 함께 쓰는 주소 한 벌.
// address 는 사람이 읽을 전체 주소이고, 나머지는 검색·지도에서 쓰는 조각이다.
export interface SelectedAddress {
    address: string;  // "서울시 영등포구 당산로 222"
    sido: string;     // "서울시"
    sigungu: string;  // "영등포구"
    dong: string;     // "당산동" (법정동. 없을 수도 있다)
    zonecode: string; // "07217"
}

// 우편번호 서비스가 돌려준 값을 우리 형태로 바꾼다.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toSelectedAddress(data: any): SelectedAddress {
    const sido = normalizeSido(data.sido ?? '');
    const sigungu: string = data.sigungu ?? '';

    // 법정동 이름. "당산동4가" 처럼 뒤에 숫자·가가 붙는 경우가 있어 그대로 둔다.
    const dong: string = data.bname ?? '';

    // 도로명 주소를 기본으로 쓰고, 없으면 지번 주소를 쓴다.
    // 시·도 표기를 우리 규칙으로 맞추기 위해 앞부분을 갈아 끼운다.
    const roadOrJibun: string = data.roadAddress || data.jibunAddress || '';

    // 서비스가 준 주소는 "서울 영등포구 당산로 222" 처럼 시·도가 짧은 형태다.
    // 앞의 짧은 시·도를 우리 표기로 바꾼다.
    const address = data.sido && roadOrJibun.startsWith(data.sido)
        ? `${sido}${roadOrJibun.slice(data.sido.length)}`
        : roadOrJibun;

    return { address, sido, sigungu, dong, zonecode: data.zonecode ?? '' };
}
