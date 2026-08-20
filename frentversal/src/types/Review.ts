// 한줄평 한 개. 매물 상세, 중개사무소 상세 등 여러 화면에서 재사용
export interface Review {
    id: number;
    rating: number;     // 별점 1~5
    content: string;    // 내용
    createdAt: string;  // 작성일 (고쳐 쓴 글은 고친 날)

    // 작성자 이름. 가운데 글자를 가린 형태로 내려온다 (홍*동).
    // 중개사무소 후기에는 아직 이 값이 없어서 선택 항목으로 둔다.
    writerName?: string;

    // 로그인한 사람이 쓴 글인지. 목록에서 "내 한줄평"을 구분해 보여 줄 때 쓴다.
    mine?: boolean;
}
