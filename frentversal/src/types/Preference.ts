/*
  맞춤 추천에서 쓰는 사용자 취향 타입.

  백엔드의 PreferenceRequestDto, PreferenceResponseDto 와 항목을 1:1 로 맞춰 두었다.
  값을 고르지 않은 항목은 null 로 두며, 서버는 그 항목을 점수 계산에서 건너뛴다.

  금액 단위는 화면 전체와 같은 만원이다. 억, 천 단위로 나눠 받지 않는 이유는
  매물 쪽 금액이 전부 만원 하나로 저장되어 있어서, 중간에 단위를 바꾸면
  화면과 서버 어느 한쪽에서 반드시 환산 실수가 나기 때문이다.
*/

import type { DealTypeCode, PropertyTypeCode } from './Recommendation';

export type Preference = {
    dealType: DealTypeCode | null;
    propertyTypes: PropertyTypeCode[];
    preferredDistricts: string[];

    minArea: number | null;
    maxArea: number | null;
    minRoomCount: number | null;

    saleMinPrice: number | null;
    saleMaxPrice: number | null;
    jeonseMinDeposit: number | null;
    jeonseMaxDeposit: number | null;
    monthlyMinDeposit: number | null;
    monthlyMaxDeposit: number | null;
    monthlyMinRent: number | null;
    monthlyMaxRent: number | null;

    newBuildPreferred: boolean;
    stationPreferred: boolean;
    educationPreferred: boolean;
    parkPreferred: boolean;
    hospitalPreferred: boolean;
    conveniencePreferred: boolean;
    busPreferred: boolean;
    lowMaintenancePreferred: boolean;

    tagIds: number[];
};

// 서버가 돌려주는 취향. 아직 한 번도 저장하지 않은 회원인지 saved 로 구분한다.
export type PreferenceResponse = Preference & {
    saved: boolean;
};

// 생활환경 선호 항목. 화면에서 토글 버튼으로 늘어놓기 위해 목록으로 둔다.
// key 는 Preference 의 항목 이름과 같아야 한다.
export type LifestyleOption = {
    key: keyof Pick<
        Preference,
        | 'newBuildPreferred'
        | 'stationPreferred'
        | 'educationPreferred'
        | 'parkPreferred'
        | 'hospitalPreferred'
        | 'conveniencePreferred'
        | 'busPreferred'
        | 'lowMaintenancePreferred'
    >;
    label: string;
};

export const LIFESTYLE_OPTIONS: LifestyleOption[] = [
    { key: 'newBuildPreferred', label: '신축' },
    { key: 'stationPreferred', label: '역세권' },
    { key: 'educationPreferred', label: '교육환경' },
    { key: 'parkPreferred', label: '공원 가까이' },
    { key: 'hospitalPreferred', label: '병원 가까이' },
    { key: 'conveniencePreferred', label: '마트 편의시설' },
    { key: 'busPreferred', label: '버스 편의' },
    { key: 'lowMaintenancePreferred', label: '낮은 관리비' },
];

// 취향을 한 번도 저장하지 않았을 때 화면이 시작점으로 쓰는 빈 값이다.
export const EMPTY_PREFERENCE: Preference = {
    dealType: null,
    propertyTypes: [],
    preferredDistricts: [],

    minArea: null,
    maxArea: null,
    minRoomCount: null,

    saleMinPrice: null,
    saleMaxPrice: null,
    jeonseMinDeposit: null,
    jeonseMaxDeposit: null,
    monthlyMinDeposit: null,
    monthlyMaxDeposit: null,
    monthlyMinRent: null,
    monthlyMaxRent: null,

    newBuildPreferred: false,
    stationPreferred: false,
    educationPreferred: false,
    parkPreferred: false,
    hospitalPreferred: false,
    conveniencePreferred: false,
    busPreferred: false,
    lowMaintenancePreferred: false,

    tagIds: [],
};
