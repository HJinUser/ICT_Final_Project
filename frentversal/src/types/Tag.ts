// 태그 분류. 동네 탐색 화면의 태그 탭 4종과 매칭됨
export type TagCategoryCode =
    | "ATMOSPHERE"          // 분위기
    | "LIVING_ENVIRONMENT"  // 생활환경
    | "TRANSPORTATION"      // 교통편의
    | "NATURAL_ENVIRONMENT"; // 자연환경

export interface TagResponse {
    id: number;
    name: string;
    category: TagCategoryCode;
}