import type { TagCategoryCode } from './Tag';

/*
  한줄평 텍스트마이닝이 뽑은 동네 태그 후보.

  evidence 는 이 태그를 고른 근거 낱말이다. 관리자가 근거를 보고 판단해야 해서 함께 내려온다.
  alreadyApplied 가 true 면 이미 그 동네에 붙어 있는 태그다.
*/
export interface NeighborhoodTagSuggestion {
    tagId: number;
    tagName: string;
    category: TagCategoryCode | null;
    evidence: string[];
    alreadyApplied: boolean;
}

/*
  관리자 태그 검토 화면의 동네 한 곳.

  동네는 법정동이고 분석은 행정동 기준이라 매핑을 거친 행정동을 함께 보여 준다.
  reviewDocumentCount 가 1이면 한 사람 의견으로 뽑은 후보라는 뜻이다.
*/
export interface NeighborhoodTagReview {
    neighborhoodId: number;
    district: string;
    dong: string;
    adminCode: string;
    adminName: string;
    reviewDocumentCount: number;

    // 지금 이 동네에 붙어 있는 태그 전부. 추천에 없는 태그(관리자가 직접 붙인 것)도 들어 있다.
    // 태그 반영은 받은 목록으로 통째로 바꾸는 방식이라, 이 값을 함께 실어 보내지 않으면
    // 추천과 무관한 태그까지 지워진다.
    currentTagIds: number[];

    suggestions: NeighborhoodTagSuggestion[];
}
