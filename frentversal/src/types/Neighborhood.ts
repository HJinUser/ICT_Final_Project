import type { TagResponse } from './Tag';

export type NeighborhoodSortCode = 'POPULAR' | 'LISTINGS' | 'NAME';

export interface NeighborhoodResponse {
    id: number;
    city: string;
    district: string;
    dong: string;
    description: string | null;
    imageUrl: string | null;
    averageJeonsePrice: number;
    propertyCount: number;
    popularityScore: number;
    visible: boolean;
    tags: TagResponse[];
}

export interface NeighborhoodListResponse {
    content: NeighborhoodResponse[];
    totalCount: number;
    cities: string[];
    districtsByCity: Record<string, string[]>;
    dongsByDistrict: Record<string, string[]>;
}

export interface NeighborhoodSearchParams {
    city?: string;
    district?: string;
    dong?: string;
    tagIds?: number[];
    sort?: NeighborhoodSortCode;
    includeHidden?: boolean;
}

// 관리자 "동네 등록" 폼이 보내는 값. 시세·인기도는 서버가 매물/찜을 집계해서 채우므로 여기 없다.
export interface NeighborhoodCreatePayload {
    city: string;
    district: string;
    dong: string;
    description: string;

    // 대표 이미지 주소. 등록 폼에서는 더 이상 입력받지 않는다 —
    // 동네 카드가 그 동네 지도를 직접 그려 주기 때문이다(NeighborhoodMap 참고).
    // 서버는 이 값이 없어도 등록을 받아 주고, 값이 있으면 지도 대신 그 사진을 쓴다.
    imageUrl?: string;
    tagIds: number[];
}
