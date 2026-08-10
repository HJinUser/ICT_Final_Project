// 한줄평 한 개. 매물 상세, 중개사무소 상세 등 여러 화면에서 재사용
export interface Review {
    id: number;
    rating: number;     // 별점
    content: string;    // 내용
    createdAt: string;  // 작성일
}