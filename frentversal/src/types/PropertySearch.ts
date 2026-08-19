// 지도 검색 화면에서 쓰는 타입
// 백엔드의 PropertySearchDto / PropertySearchCondition 과 1:1로 맞춰 두었다.

export interface PropertySearchItem {
    id: number;
    name: string;
    dealType: 'SALE' | 'JEONSE' | 'MONTHLY';
    priceLabel: string;   // "전세 4억 9,000"
    price: number | null; // 대표 금액(만원). 지도 핀 문구와 정렬에 쓴다
    address: string;
    // 지도에서 묶는 기준이자 카드에 보여 줄 지역 이름.
    // 주소에서 뽑지 못하면 null 이고, 그런 매물은 묶이지 않고 개별로만 표시된다.
    city: string | null; // 시·도 (아주 넓게 봤을 때)
    gu: string | null;   // 구·시·군 (많이 축소했을 때)
    dong: string | null; // 동 (조금 축소했을 때)
    area: number | null;      // 숫자 (정렬용)
    areaLabel: string | null; // "84㎡"
    floor: number | null;
    roomCount: number | null;

    // 지도 핀 좌표. 좌표를 못 채운 매물은 null 이고 핀이 찍히지 않는다.
    latitude: number | null;
    longitude: number | null;

    status: string;
    statusLabel: string;

    agencyId: number | null;
    agencyName: string | null;

    thumbnailUrl: string | null;

    type: string;      // ONE_TWO_ROOM / APARTMENT / VILLA / OFFICETEL
    typeLabel: string; // 원/투룸 · 아파트 ...

    // 시세 평가 (AI 예상 시세와 호가 비교). 예상 시세가 없으면 priceLevel 이 null 이다.
    priceEvaluation: 'UNDERVALUED' | 'FAIR' | 'OVERVALUED' | null;

    keywords: string[]; // 카드에 붙는 핵심 키워드(태그)
}

export interface PropertySearchResponse {
    content: PropertySearchItem[];
    totalCount: number;
}

// 왼쪽 필터에서 고른 조건. 고르지 않은 항목은 보내지 않는다.
export interface PropertySearchParams {
    // 상단 검색창(헤더·메인 히어로)에서 넘어온 자유 검색어.
    // 지역명뿐 아니라 매물 이름·주소까지 함께 찾는다. 왼쪽 필터와는 별개로 동작한다.
    keyword?: string;
    region?: string;      // 구
    dong?: string;        // 동
    type?: string;        // 매물 유형 (하나만)
    dealType?: string;    // SALE / JEONSE / MONTHLY / ALL
    minPrice?: number;    // 만원
    maxPrice?: number;
    minArea?: number;     // ㎡
    maxArea?: number;
    roomCounts?: number[]; // 방 개수 (복수 선택, 3은 "3개 이상")
    tagIds?: number[];     // 특수 조건 (고른 것을 모두 가진 매물만)
    mine?: boolean;        // 중개인이 "내 매물"만 볼 때
    sort?: PropertySort;
}

// 매물 유형 버튼 (기획서: 하나만 선택, 기본값 전체)
export const PROPERTY_TYPES = [
    { value: 'ALL', label: '전체' },
    { value: 'ONE_TWO_ROOM', label: '원/투룸' },
    { value: 'APARTMENT', label: '아파트' },
    { value: 'VILLA', label: '주택/빌라' },
    { value: 'OFFICETEL', label: '오피스텔' },
];

// 거래 유형 버튼 (기획서 순서: 전체 | 매매 | 월세 | 전세)
export const DEAL_TYPES = [
    { value: 'ALL', label: '전체' },
    { value: 'SALE', label: '매매' },
    { value: 'MONTHLY', label: '월세' },
    { value: 'JEONSE', label: '전세' },
];

// 방 개수 버튼 (복수 선택. 3은 "3개 이상")
export const ROOM_COUNTS = [
    { value: 1, label: '1개(원룸)' },
    { value: 2, label: '2개' },
    { value: 3, label: '3개 이상' },
];

// 자주 검색되는 가격대. 거래 유형마다 금액대가 달라서 따로 둔다. (만원)
export const PRICE_PRESETS: Record<string, { label: string; minPrice?: number; maxPrice?: number }[]> = {
    ALL: [
        { label: '1억 이하', maxPrice: 10000 },
        { label: '1억~3억', minPrice: 10000, maxPrice: 30000 },
        { label: '3억~5억', minPrice: 30000, maxPrice: 50000 },
        { label: '5억 이상', minPrice: 50000 },
    ],
    JEONSE: [
        { label: '2억 이하', maxPrice: 20000 },
        { label: '2억~4억', minPrice: 20000, maxPrice: 40000 },
        { label: '4억~6억', minPrice: 40000, maxPrice: 60000 },
        { label: '6억 이상', minPrice: 60000 },
    ],
    MONTHLY: [
        { label: '보증금 1천 이하', maxPrice: 1000 },
        { label: '1천~3천', minPrice: 1000, maxPrice: 3000 },
        { label: '3천~5천', minPrice: 3000, maxPrice: 5000 },
        { label: '5천 이상', minPrice: 5000 },
    ],
    SALE: [
        { label: '5억 이하', maxPrice: 50000 },
        { label: '5억~10억', minPrice: 50000, maxPrice: 100000 },
        { label: '10억~15억', minPrice: 100000, maxPrice: 150000 },
        { label: '15억 이상', minPrice: 150000 },
    ],
};

// 면적 드롭다운 값 (㎡)
export const AREA_OPTIONS = [20, 40, 60, 85, 100, 135];

// 화면정의서 3-1의 오른쪽 사이드바 정렬 메뉴와 짝을 이룬다
export type PropertySort = 'LATEST' | 'PRICE_ASC' | 'PRICE_DESC' | 'AREA_DESC' | 'AREA_ASC';

export const SORT_OPTIONS: { value: PropertySort; label: string }[] = [
    { value: 'LATEST', label: '최신 등록순' },
    { value: 'PRICE_ASC', label: '가격 낮은순' },
    { value: 'PRICE_DESC', label: '가격 높은순' },
    { value: 'AREA_DESC', label: '면적 넓은순' },
    { value: 'AREA_ASC', label: '면적 좁은순' },
];

export interface PropertyListingsParams {
    type?: string;     // 매물 유형 (하나만, 'ALL'이면 안 보낸다)
    dealType?: string; // 거래 유형 (하나만, 'ALL'이면 안 보낸다)
    sort?: PropertySort;
    page?: number; // 0부터 시작
    size?: number;
}

export interface PropertyListingsResponse {
    content: PropertySearchItem[];
    totalCount: number;
    totalPages: number;
    page: number;
}