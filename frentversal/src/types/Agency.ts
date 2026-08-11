// 중개사무소 정보. 매물 상세, 중개사무소 목록/상세, 내 중개사무소 페이지 등에서 공통으로 재사용
export interface Agency {
    id: number;
    name: string;           // 중개사무소 이름
    registrationNo: string; // 등록번호
    address: string;        // 중개사무소 주소
    phone: string;          // 전화번호
    agentName: string;      // 담당 공인중개사 이름
    available: boolean;     // 상담 가능 여부
}

// ─────────────────────────────────────────────────────────────
// 아래는 중개사무소 API(GET /agency)의 실제 응답 타입.
// 백엔드 AgencyResponseDto.java 와 1:1로 맞춰 두었으므로, 서버 필드가 바뀌면 여기도 같이 바꾼다.
//
// 위의 Agency 는 매물 상세 화면(PropertyPage)에서 쓰는 요약 타입이라 필드 이름이 조금 다르다.
//   agentName  → brokerName (ERD 의 broker_name)
//   available  → status (AVAILABLE / RESERVED / CLOSED)
//   registrationNo 는 ERD 와 agency 테이블에 아직 없는 컬럼이다.
// 매물 API 가 실제로 붙는 시점에 둘을 하나로 합치는 것이 좋다.
// ─────────────────────────────────────────────────────────────

// 상담 상태 코드. 색상은 화면 표현이라 서버가 아니라 프론트에서 매핑한다.
export type AgencyStatus = 'AVAILABLE' | 'RESERVED' | 'CLOSED';

export interface AgencyResponse {
    id: number;
    name: string;         // 중개사무소 이름
    brokerName: string;   // 공인중개사 이름
    address: string;      // 사무소 주소
    phone: string | null; // 사무소 전화번호
    hours: string | null; // 영업시간
    latitude: number | null;  // 위도 (지도 마커용)
    longitude: number | null; // 경도 (지도 마커용)
    verified: boolean;    // 관리자 인증 완료 여부
    ratingAvg: number;    // 이용자 평점 평균
    status: AgencyStatus;
    statusLabel: string;  // "상담 가능" 등 화면에 그대로 쓸 한글 라벨
    listingCount: number; // 등록 매물 건수
}

// GET /agency 의 응답 형태
// 나중에 페이징이 붙어도 content 안에 목록이 들어오는 구조는 그대로 유지된다.
export interface AgencyListResponse {
    content: AgencyResponse[];
    totalCount: number;
    verifiedCount: number; // 인증 완료 사무소 수 (화면 상단 통계)
}

// ── 중개사무소 상세 페이지 (GET /agency/{id}) ──────────────────

// 담당 매물 카드 1건 (백엔드 AgencyPropertyDto)
export interface AgencyProperty {
    id: number;
    name: string;
    dealType: 'SALE' | 'JEONSE' | 'MONTHLY';
    priceLabel: string; // "전세 4억 9,000" 처럼 서버가 만들어 준 문구
    dong: string;       // 동네
    area: string | null;// "84㎡"
}

// 상세 화면 전체 응답 (백엔드 AgencyDetailDto)
// 목록용 AgencyResponse 에 등록번호·이미지·담당 매물·후기 수가 더해진 형태다.
export interface AgencyDetail {
    id: number;
    name: string;
    brokerName: string;
    address: string;
    phone: string | null;
    hours: string | null;
    registrationNo: string | null;
    latitude: number | null;
    longitude: number | null;
    verified: boolean;
    ratingAvg: number;
    status: AgencyStatus;
    statusLabel: string;
    imageUrls: string[];        // 사무소 대표 이미지 (갤러리)
    listingCount: number;       // 담당 매물 전체 건수
    todayNewCount: number;      // 오늘 신규 매물 건수
    recentProperties: AgencyProperty[]; // 최근 등록 매물 2건
    reviewCount: number;
}

// 이용자 평가 1건 (백엔드 AgencyReviewDto)
export interface AgencyReview {
    id: number;
    writerName: string; // 가운데를 가린 작성자 이름
    rating: number;     // 1~5
    content: string;
    createdAt: string;  // "2026.08.10"

    // 중개인이 단 답변. 아직 답변하지 않았으면 null 이다.
    // 중개인 마이페이지의 리뷰 관리 탭에서 이 값이 null 인 것을 "미답변"으로 센다.
    reply: string | null;
    repliedAt: string | null;
}

// 상담 요청 보낼 때 서버로 넘기는 값
export interface ConsultationRequest {
    propertyId: number | null;
    preferredDate: string | null; // "2026-08-11"
    content: string;
    agreed: boolean;              // 내 정보 제공 동의
}
