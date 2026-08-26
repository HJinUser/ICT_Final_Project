import type { PropertyResponse, PropertyStatusCode } from "./Property";
import type { Agency } from "./Agency";
import type { Review } from "./Review";

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

    // 시세 그래프는 이 타입에 담지 않는다.
    // GET /property/{id}/price-trend 로 따로 받아 화면에서만 들고 있는다
    // (types/PropertyPriceTrend.ts 참고).

    // 이 매물의 한줄평 목록. GET /property/{id}/reviews 로 따로 받아 채운다.
    // (매물 상세 응답에는 들어 있지 않다)
    reviews: Review[];

    // TODO: 관심매물 기능 연동 전, 화면 확인용
    isFavorited: boolean;
}

// 화면에 보여줄 거래상태 한글 라벨. PropertyStatusCode(백엔드 enum)와 1:1 매칭
export const PROPERTY_STATUS_LABELS: Record<PropertyStatusCode, string> = {
    DRAFT: "임시저장",
    PENDING: "승인대기",
    ACTIVE: "게시중",
    IN_PROGRESS: "거래진행중",
    COMPLETED: "거래완료",
    CANCELLED: "등록취소",
};