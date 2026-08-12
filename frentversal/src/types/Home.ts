/*
  메인 홈페이지가 보여 주는 데이터의 타입.

  지금은 서버에 해당 API가 없어서 homeApi.ts가 예시 데이터를 돌려주지만,
  화면(HomePage.tsx)은 처음부터 이 타입만 보고 그리도록 만들어 두었다.
  나중에 서버가 붙으면 homeApi.ts 안의 함수 본문만 실제 호출로 바꾸면 되고
  화면 코드는 손대지 않아도 된다.
*/

// 시세 대비 평가. 저평가/적정/고평가 3단계이며 화면에서 배지 색이 달라진다.
// 백엔드 PropertyStatus가 아니라 "시세 비교 결과"라서 별도 값이다.
export type PriceLevel = 'LOW' | 'MID' | 'HIGH';

// 메인의 "이번 주 시세보다 싸게 나온 집" 카드 1건
export type WeeklyProperty = {
    id: number;
    imageUrl: string;
    // "전세 4억 9,000"처럼 서버가 만들어 준 표시용 문구.
    // 금액 단위(억/만) 변환 규칙을 화면마다 다시 짜지 않으려고 문자열로 받는다.
    priceLabel: string;
    // "서초구 반포동 · 84㎡ · 12층"
    summary: string;
    // "반포역 도보 4분"
    transit: string;
    // "동네 시세 5억 4,000"
    marketPriceLabel: string;
    // "시세보다 5,000만 낮음" — 배지에 그대로 노출한다
    diffLabel: string;
    level: PriceLevel;
    // 시세 막대에서 이 매물의 호가가 찍히는 위치(0~100). 50이 동네 평균이다.
    gaugePosition: number;
};

// 메인의 "동네부터 고르는 방법" 타일 1건
export type HomeNeighborhood = {
    id: number;
    name: string;
    imageUrl: string;
    // K-means 군집 결과로 붙은 동네 성격. 예: "조용한 주거형"
    kind: string;
    // "평균 전세 4억 1,000", "역까지 12분" 같은 짧은 지표들
    stats: string[];
    // 한줄평에서 뽑은 키워드. 큰 타일에서만 보여 준다.
    tags: string[];
};

// 메인의 "살아본 사람들의 말" 한줄평 1건
export type HomeVoice = {
    id: number;
    neighborhood: string;
    content: string;
    // "2026.07.12" 형태로 서버가 포맷해서 내려준다
    createdAt: string;
};

// 워드클라우드 단어 1개. weight가 클수록 크게 그린다(1~5).
export type CloudWord = {
    text: string;
    weight: 1 | 2 | 3 | 4 | 5;
};

// 메인 화면이 한 번에 받아 오는 전체 데이터
export type HomeData = {
    // 히어로 영역에 띄우는 "이번 주 저평가 매물 수"
    weeklyLowCount: number;
    weeklyProperties: WeeklyProperty[];
    neighborhoods: HomeNeighborhood[];
    voices: HomeVoice[];
    // 워드클라우드 대상 동네 이름과 단어들
    cloudNeighborhood: string;
    cloudWords: CloudWord[];
    cloudSourceCount: number;
};
