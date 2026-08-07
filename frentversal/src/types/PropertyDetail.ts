import type { Property } from "./Property";
import type { Agency } from "./Agency";
import type { Review } from "./Review";

// AI 시세예측 그래프에 쓰이는 연도별 한 점 (지금은 이 화면 전용이라 여기 둠)
export interface PriceHistoryPoint {
    year: string;       // 연도
    price: number;      // 가격
}

// 매물 상세 페이지 전체 응답 형태
export interface PropertyDetail extends Property {
    id: number;

    // 이 매물을 등록한 중개인의 회원 id. 로그인한 중개인의 id와 비교해서
    // "내 매물"인지 판단할 때 씀 (내 매물일 때만 수정/상태변경 버튼을 보여줘야 함)
    ownerId: number;

    // 거래 상태. 게시중 ↔ 거래진행중은 자유롭게 바뀌지만
    // 거래완료·등록취소는 한 번 바뀌면 되돌릴 수 없고, 이 상태가 되면 다른 화면(목록·지도 등)엔 노출되지 않음
    dealStatus: "게시중" | "거래진행중" | "거래완료" | "등록취소";

    // 공개/비공개 여부. dealStatus와는 별개의 스위치. false면 다른 화면엔 노출되지 않음
    isPublic: boolean;

    // 중개인이 가격을 변경했을 때 매물명 아래 표시되는 배지. 변경 이력 없으면 null
    priceStatus: "하락" | "상승" | null;
    aiEstimatedPrice: number;
    priceHistory: PriceHistoryPoint[];
    tags: string[];
    reviews: Review[];
    agency: Agency;
    isFavorited: boolean;
}