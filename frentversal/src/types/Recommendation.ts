/*
  맞춤 추천 화면에서 쓰는 타입.

  백엔드의 RecommendationResponseDto 와 항목을 1:1 로 맞춰 두었다.

  점수와 추천 이유는 화면이 직접 계산하지 않는다. 서버가 준 값을 그대로 보여 주기만 한다.
  나중에 추천 계산이 규칙에서 학습한 모델로 바뀌어도 이 타입과 화면은 그대로 쓰기 위해서다.
  무엇이 계산했는지는 modelVersion 으로 구분한다.
*/

import type { PropertySearchItem } from './PropertySearch';

export type DealTypeCode = 'SALE' | 'JEONSE' | 'MONTHLY';

export type PropertyTypeCode = 'ONE_TWO_ROOM' | 'APARTMENT' | 'VILLA' | 'OFFICETEL';

export type RecommendationFeedbackType = 'LIKE' | 'DISLIKE';

// 추천 매물 한 건. 화면의 카드 한 장에 대응된다.
export type RecommendationItem = {
    propertyId: number;
    // 추천 적합도. 확률이 아니라 0~100 으로 바꾼 적합 점수다.
    score: number;
    reasons: string[];
    // 사용자가 직접 별표로 지정한 매물인지 여부
    userBest: boolean;
    // 사용자가 별표를 지정하지 않았을 때 점수가 가장 높아 첫 카드가 된 매물인지 여부
    aiBest: boolean;
    // 카드에 보여 줄 매물 정보. 지도 검색 카드와 같은 모양이라 그 타입을 그대로 쓴다.
    property: PropertySearchItem;
};

// 추천 동네 한 건.
// adminCode 와 clusterName 은 행정동 군집 분석 결과가 붙었을 때 채워진다.
// 그 전까지는 지금 동네 자료(법정동)로 계산하므로 neighborhoodId 만 값이 있다.
export type NeighborhoodRecommendationItem = {
    adminCode: string | null;
    adminName: string;
    districtName: string;
    score: number;
    clusterName: string | null;
    reasons: string[];
    neighborhoodId: number | null;
};

export type RecommendationResponse = {
    modelVersion: string;
    items: RecommendationItem[];
    neighborhoods: NeighborhoodRecommendationItem[];
};

// 평가를 보낼 때 쓰는 요청.
// 평가 당시 화면에 떠 있던 점수와 모델 버전을 함께 보내서, 나중에 어느 방식이 만든 추천이
// 좋은 평가를 받았는지 버전끼리 비교할 수 있게 한다.
export type RecommendationFeedbackRequest = {
    propertyId: number;
    type: RecommendationFeedbackType;
    recommendationScore?: number;
    modelVersion?: string;
};

// 거래 유형 선택 버튼
export const DEAL_TYPE_OPTIONS: { value: DealTypeCode; label: string }[] = [
    { value: 'SALE', label: '매매' },
    { value: 'JEONSE', label: '전세' },
    { value: 'MONTHLY', label: '월세' },
];

// 매물 유형 선택 버튼
export const PROPERTY_TYPE_OPTIONS: { value: PropertyTypeCode; label: string }[] = [
    { value: 'ONE_TWO_ROOM', label: '원/투룸' },
    { value: 'APARTMENT', label: '아파트' },
    { value: 'VILLA', label: '주택/빌라' },
    { value: 'OFFICETEL', label: '오피스텔' },
];
