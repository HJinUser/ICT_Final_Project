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

// 메인의 "회원님 취향에 맞춘 집" 카드 1건.
// 맞춤 추천 페이지(/recommend)의 카드에서 최소 항목만 뽑아 온 형태다.
export type HomeRecommendation = {
    id: number;
    imageUrl: string;
    priceLabel: string;
    // "서초구 방배동 · 59㎡ · 4층"
    summary: string;
    // 이 매물이 사용자의 취향 중 무엇을 만족했는지. "역 도보 5분 · 신축 · 반려동물 가능"
    reason: string;
    // AI 적합도(0~100). 화면에서 막대와 숫자로 함께 보여 준다.
    fitScore: number;
};

// 메인의 "두 집, 나란히 비교해보세요" 표에 들어가는 매물 1건.
// 실제 비교 페이지(/property/compare)처럼 사용자가 고른 매물이 아니라,
// 같은 동네에서 가격 차이가 큰 두 매물을 예시로 보여 주는 용도라 항상 2건 고정이다.
//
// 표시용 문자열이 아니라 "숫자 원본"을 그대로 받는다.
// 미리보기라도 어느 쪽이 더 나은지를 실제로 계산해서 표시해야 하기 때문이다.
// (문자열로 받으면 비교가 불가능해 승자를 손으로 지정할 수밖에 없다)
export type HomeCompareItem = {
    id: number;
    // 매물 이름. 표 헤더에 쓰고, 칸을 누르면 이 id로 상세 페이지에 간다.
    name: string;
    imageUrl: string;
    // "전세" / "월세" / "매매"
    dealTypeLabel: string;
    // 금액·AI 시세·관리비는 모두 만원 단위 정수다 (예: 49000 = 4억 9,000만 원)
    price: number;
    aiPrice: number;
    maintenanceCost: number;
    // 전용 면적(㎡)
    area: number;
    // 역까지 도보 분
    stationMinutes: number;
    // 주변 환경 태그. 화면에는 최대 5개까지만 보여 준다.
    tags: string[];
    // AI 추천 점수(0~100)
    aiScore: number;
    neighborhood: string;
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
    // 맞춤 추천 미리보기. 비회원에게도 내려오지만 화면에서는 잠금 처리해 보여 준다.
    recommendations: HomeRecommendation[];
    // "매물 비교해보기" 예시 두 건. 항상 길이 2로 내려온다.
    compareExample: [HomeCompareItem, HomeCompareItem];
    neighborhoods: HomeNeighborhood[];
    voices: HomeVoice[];
    // 워드클라우드 대상 동네 이름과 단어들
    cloudNeighborhood: string;
    cloudWords: CloudWord[];
    cloudSourceCount: number;
};
