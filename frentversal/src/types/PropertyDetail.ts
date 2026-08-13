import type { PropertyResponse, PropertyStatusCode } from "./Property";
import type { Agency } from "./Agency";
import type { Review } from "./Review";

// AI 시세예측 그래프에 쓰이는 연도별 한 점. 백엔드에 아직 없는 기능(시장 통계, ML 쪽)이라 화면 전용 목데이터.
export interface PriceHistoryPoint {
    year: string;
    price: number;
}

// 매물 상세 페이지 전체 데이터 형태.
// 백엔드 GET /property/{id}가 실제로 돌려주는 PropertyResponse를 그대로 물려받고,
// 아직 백엔드가 못 챙겨주는 화면 전용 필드만 추가한다.
export interface PropertyDetail extends PropertyResponse {
    // 이 매물을 등록한 중개인의 회원 id. 로그인한 중개인 본인 소유인지 판단할 때 씀.
    // 이 필드 대신 agencyDetail.memberId를 쓰는 걸로 교체 (agency 도메인은 그쪽 담당이라 지금은 안 건드림)
    ownerId: number;

    // 중개사무소 전체 정보. PropertyResponse는 agencyId(숫자)만 주기 때문에,
    // 상세 페이지에서 GET /agency/{agencyId}를 한 번 더 호출해서 채운다.
    agencyDetail: Agency;

    // TODO: 동네/유형별 시세 추이(시장 통계) 기능. ML 쪽과 엮인 범위라 지금은 화면 확인용 목데이터
    priceHistory: PriceHistoryPoint[];

    // TODO: Review 도메인 아직 안 만들어짐, 화면 확인용 목데이터
    reviews: Review[];

    // TODO: 관심매물 기능 연동 전, 화면 확인용
    isFavorited: boolean;
}

// 화면에 보여줄 거래상태 한글 라벨. PropertyStatusCode(백엔드 enum)와 1:1 매칭
export const PROPERTY_STATUS_LABELS: Record<PropertyStatusCode, string> = {
    PENDING: "승인대기",
    ACTIVE: "게시중",
    IN_PROGRESS: "거래진행중",
    COMPLETED: "거래완료",
    CANCELLED: "등록취소",
};