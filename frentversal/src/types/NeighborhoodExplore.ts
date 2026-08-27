import type { TagResponse } from './Tag';

/*
  동네 탐색(서울 전체 행정동 425개 기준) 목록 항목.

  adminCode 이하 다섯 필드는 파이썬 K-Means 결과이고, propertyCount·averageJeonsePrice 는
  Property.adminCode 로 집계한 값이다. neighborhoodId 이하 네 필드는 관리자가 등록한 법정동과
  대응되는 경우에만 값이 있고, 없으면 null(또는 빈 배열)이다.

  keywords 는 한줄평 텍스트마이닝이 뽑은 낱말이다. 관리자가 등록한 동네가 425개 중 7개뿐이라
  대부분의 카드는 tags 가 비는데, 그 자리를 대신 채운다.
  확정된 태그가 아니므로 화면에서도 태그와 구분해서 그린다.
*/
export interface NeighborhoodExploreItem {
    adminCode: string;
    adminName: string;
    districtName: string;
    clusterId: number | null;
    clusterName: string;
    propertyCount: number;
    averageJeonsePrice: number;
    neighborhoodId: number | null;
    description: string | null;
    imageUrl: string | null;
    // 관리자가 확정해서 붙인 태그
    tags: TagResponse[];
    // 한줄평 분석이 제안한 태그. 아직 확정 전이라 화면에서 확정 태그와 구분해서 그린다.
    // 확정 태그는 등록된 동네 7곳에만 있어서, 태그 필터는 이 값까지 함께 본다.
    suggestedTags: TagResponse[];
    keywords: string[];
    // 고른 태그 가운데 이 동네가 가진 개수. 많이 맞을수록 목록 앞에 온다.
    matchedTagCount: number;
}

export interface NeighborhoodExploreResponse {
    content: NeighborhoodExploreItem[];
    // 필터 탭·드롭다운·칩을 그릴 후보. 현재 선택과 무관하게 전체 425개 기준으로 온다.
    clusterNames: string[];
    districts: string[];
    /*
      동네 유형별 태그 묶음 (유형 이름 -> 태그 이름 목록).

      파이썬이 각 군집을 정의하는 생활지표를 기준으로 배분해 둔 것이다.
      여기에 없는 태그(엘리베이터·풀옵션처럼 집 한 채의 속성인 것)는 아예 오지 않는다.
    */
    tagGroups: Record<string, string[]>;
}

export interface NeighborhoodExploreSearchParams {
    clusterName?: string;
    district?: string;
    // 여러 개를 고르면 "모두 가진 동네"가 아니라 "하나라도 가진 동네"를 보여준다.
    tagNames?: string[];
}
