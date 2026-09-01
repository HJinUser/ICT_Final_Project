/*
  메인 홈페이지가 보여 주는 데이터의 타입.

  맞춤 추천·한줄평은 아직 대응하는 백엔드가 없어서 homeApi.ts가 예시 데이터를 돌려주지만,
  "두 집, 나란히 비교해보세요"(compare)는 이제 실제 데이터다 — PropertyService.getHomeCompareHighlights()
  참고. 화면(HomePage.tsx)은 이 타입만 보고 그리도록 만들어 두었으니, 나머지도 서버가 붙으면
  homeApi.ts 안의 함수 본문만 실제 호출로 바꾸면 되고 화면 코드는 손대지 않아도 된다.
*/

import type { PropertyResponse } from './Property';

// 시세 대비 평가. 관리자가 매물마다 수동으로 저평가/적정/고평가 중 하나를 고른 값이다.
// 백엔드 PropertyStatus가 아니라 "시세 비교 결과"라서 별도 값이다.
export type PriceEvaluation = 'UNDERVALUED' | 'FAIR' | 'OVERVALUED';

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
    // 이 목록 자체가 이미 저평가(UNDERVALUED) 매물만 모아 둔 것이지만,
    // 배지 표시는 다른 화면(ListingsPage 등)과 같은 값을 그대로 재사용한다.
    priceEvaluation: PriceEvaluation;
};

// 메인의 "동네부터 고르는 방법" 타일 1건
export type HomeNeighborhood = {
    id: number;
    name: string;
    // NeighborhoodMap에 넘길 구 이름
    district: string;
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

/*
  메인의 "두 집, 나란히 비교해보세요" 표에 쓰는 실제 데이터.

  GET /property/home-compare (PropertyService.getHomeCompareHighlights) 가 그대로 내려주는 모양이다.
  거래유형(매매/전세/월세)끼리는 대표 금액 필드가 달라 서로 비교할 수 없어서
  (ComparePage.tsx의 compareProperties()도 같은 이유로 같은 거래유형끼리만 비교를 허용한다),
  화면은 거래유형별로 탭을 나눠 각 탭 안에서만 두 매물을 비교한다.

  배열 길이가 그대로 화면 상태를 알려준다:
    0건 : 이 거래유형 매물이 아예 없음 → 화면 전체 블러 처리 + 안내 문구
    1건 : 비교 상대가 없음 → 있는 매물 하나만 흐리게 보여 주고 안내 문구도 함께 띄운다
    2건 : 정상 비교 (0번 = 합산 순위가 더 좋은 매물, 1번 = 더 안 좋은 매물)
*/
export type HomeCompareData = {
    sale: PropertyResponse[];
    jeonse: PropertyResponse[];
    monthly: PropertyResponse[];
};

// 메인 화면이 한 번에 받아 오는 전체 데이터
export type HomeData = {
    // 히어로 영역에 띄우는 "이번 주 저평가 매물 수"
    weeklyLowCount: number;
    weeklyProperties: WeeklyProperty[];
    // 맞춤 추천 미리보기. 비회원에게도 내려오지만 화면에서는 잠금 처리해 보여 준다.
    recommendations: HomeRecommendation[];
    compare: HomeCompareData;
    neighborhoods: HomeNeighborhood[];
    voices: HomeVoice[];
};
