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

// 태그 분류(영문 코드)를 화면에 보여 줄 한글 이름으로 바꾼 표.
// 태그를 묶어서 보여 주는 화면이 여러 곳이라 한곳에 두고 가져다 쓴다.
export const TAG_CATEGORY_LABELS: Record<TagCategoryCode, string> = {
    ATMOSPHERE: "분위기",
    LIVING_ENVIRONMENT: "생활환경",
    TRANSPORTATION: "교통편의",
    NATURAL_ENVIRONMENT: "자연환경",
};

// 태그를 묶어서 보여 줄 때 쓰는 분류 순서.
// Object.keys 로 뽑으면 순서가 보장되지 않아 화면마다 묶음 차례가 달라질 수 있어서 따로 적어 둔다.
export const TAG_CATEGORY_ORDER: TagCategoryCode[] = [
    "ATMOSPHERE",
    "LIVING_ENVIRONMENT",
    "TRANSPORTATION",
    "NATURAL_ENVIRONMENT",
];