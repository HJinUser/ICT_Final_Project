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
