import type { TagResponse } from "./Tag";

// 매물 유형/거래유형/계약상태/거래상태 코드값.
// @Enumerated(EnumType.STRING)이라 백엔드 enum 상수 이름 그대로 문자열로 주고받는다. 철자 동일하게 맞출 것.
export type PropertyTypeCode = "ONE_TWO_ROOM" | "APARTMENT" | "VILLA" | "OFFICETEL";
export type DealTypeCode = "SALE" | "JEONSE" | "MONTHLY";
export type ContractStatusCode = "IMMEDIATE" | "NEGOTIABLE";
export type PropertyStatusCode = "PENDING" | "ACTIVE" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
export type PriceChangeStatusCode = "UP" | "DOWN";

// 매물 등록/수정 시 서버로 보내는 요청 형태 (PropertyController가 받는 Property 엔터티와 대응).
// 등록은 멀티파트(JSON "data" 파트 + 파일 "files" 파트)로 나가기 때문에, 사진 파일 자체는
// 여기 넣지 않는다 — 폼에서 별도의 File[] 상태로 들고 있다가 제출할 때 FormData로 합친다.
export interface Property {
    id?: number;
    keepImageIds?: number[];

    // 중개사무소 id 는 요청에 넣지 않는다.
    // 서버가 로그인한 중개인의 사무소를 직접 찾아 채우고, 본문으로 온 값은 무시한다.
    neighborhoodId?: number;        // 동네 id

    name: string;                   // 매물명
    type: PropertyTypeCode;         // 원/투룸, 아파트, 주택/빌라, 오피스텔
    dealType: DealTypeCode;         // 매매, 전세, 월세
    address: string;                // 주소 (도로명, 주소 검색으로만 입력된다)

    // 주소 검색이 함께 준 지역 조각. 도로명 주소에는 동이 없어서 따로 보낸다.
    // 지도에서 동네끼리 묶을 때 서버가 이 값을 쓴다.
    sigungu?: string;
    dong?: string;

    area: number;                   // 전용면적(㎡)
    floor: number;                  // 층수
    roomCount: number;              // 방 개수
    bathroomCount: number;          // 욕실 개수

    // 건축 연도. 맞춤 추천에서 신축인지 판단하는 데 쓴다.
    // 이 항목이 생기기 전에 등록한 매물은 값이 없어서 선택 항목으로 둔다.
    buildYear?: number;

    // 거래유형(dealType)에 따라 쓰이는 필드가 다름 — validatePricingFields와 동일한 규칙
    price?: number;                 // 매매가(만원)
    deposit?: number;               // 전세가(만원)
    monthlyDeposit?: number;        // 월세 보증금(만원)
    monthlyRent?: number;           // 월세 금액(만원)
    maintenanceFee: number;         // 관리비(만원)

    description: string;            // 소개 글
    detailDescription: string;      // 상세 설명
    moveInDate: string;             // 입주 가능일
    contractStatus: ContractStatusCode; // 계약 가능 상태

    tagIds?: number[];              // 선택한 태그 id 목록 (서버가 Tag로 변환 후 저장, DB엔 이 필드 자체는 없음)
}

// ─────────────────────────────────────────────────────────────
// 아래는 GET /property/{id}, /property/compare 등 실제 응답 타입.
// 백엔드 PropertyResponseDto.java 와 1:1로 맞춰 두었으므로, 서버 필드가 바뀌면 여기도 같이 바꾼다.
// ─────────────────────────────────────────────────────────────

export interface PropertyImageResponse {
    id: number;
    url: string;
    isMain: boolean;
    sortOrder: number;
}

export interface PropertyResponse {
    id: number;

    agencyId: number;
    neighborhoodId: number | null;

    name: string;
    type: PropertyTypeCode;
    dealType: DealTypeCode;
    address: string;

    // 주소 검색이 함께 준 지역 조각. 도로명 주소에는 동이 없어서 서버가 따로 보관한다.
    // 수정 화면이 이 값을 그대로 되돌려 보내야 저장할 때 지워지지 않는다.
    sigungu: string | null;
    dong: string | null;

    area: number;
    floor: number;
    roomCount: number;
    bathroomCount: number;

    // 건축 연도. 예전에 등록한 매물에는 값이 없어서 null 이 올 수 있다.
    buildYear: number | null;

    price: number | null;
    deposit: number | null;
    monthlyDeposit: number | null;
    monthlyRent: number | null;
    maintenanceFee: number;

    description: string;
    detailDescription: string;
    moveInDate: string | null;
    contractStatus: ContractStatusCode | null;

    images: PropertyImageResponse[];
    tags: TagResponse[];

    status: PropertyStatusCode;
    visible: boolean;
    aiPrice: number | null;
    aiDeposit: number | null;
    aiMonthlyDeposit: number | null;
    aiMonthlyRent: number | null;
    aiRecommendScore: number | null;
    priceStatus: PriceChangeStatusCode | null;

    // Python이 지오코딩/유클리드 거리로 계산해서 채워주는 값. 연동 전이라 지금은 대부분 null로 옴.
    latitude: number | null;
    longitude: number | null;
    stationDistance: number | null; // 최근접 역까지 거리 (단위는 Python 연동 시 확정)

    createdAt: string; // LocalDateTime -> JSON에선 문자열로 옴
}