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
    imageUrl: string;
    tagIds: number[];
}
