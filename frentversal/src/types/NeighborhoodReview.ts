/*
  동네 한줄평 타입.

  여기서 다루는 adminCode 는 "행정동" 코드다.
  동네 탐색(types/Neighborhood.ts)의 Neighborhood.id / dong 은 "법정동" 기준이라
  코드 체계가 서로 다르다. 두 값을 서로 바꿔 넣으면 안 된다.

  서버의 NeighborhoodReviewResponseDto 와 항목을 1:1 로 맞춰 두었다.
*/

// 한 사람이 같은 동네에 남길 수 있는 한줄평 길이 상한.
// 서버 엔티티의 content 컬럼 길이(300)와 같은 값이라 한쪽만 바꾸면 안 된다.
export const MAX_REVIEW_LENGTH = 300;

export type NeighborhoodReview = {
    id: number;
    // 작성자 표기. 서버가 보는 사람에 따라 다른 값을 채워 준다.
    // 일반 사용자·중개인·비로그인은 "익명", 관리자만 실제 이름을 받는다.
    memberName: string;
    adminCode: string;
    adminName: string;
    districtName: string;
    content: string;
    // 서버가 보내는 LocalDateTime 문자열 (예: "2026-08-20T11:44:00")
    updatedAt: string;
    // 로그인한 내가 쓴 글인지. true 인 항목에만 수정·삭제 버튼을 보여 준다.
    mine: boolean;
};

// 한줄평을 남길 때 보내는 값. 같은 동네에 다시 써도 덮어쓰지 않고 새 글로 쌓인다.
export type NeighborhoodReviewRequest = {
    adminCode: string;
    adminName: string;
    districtName: string;
    content: string;
};
