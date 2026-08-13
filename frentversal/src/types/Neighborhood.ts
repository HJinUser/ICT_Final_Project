import type { TagResponse } from './Tag';

export type NeighborhoodSortCode = 'POPULAR' | 'LISTINGS' | 'NAME';

export interface NeighborhoodResponse {
    id: number;
    city: string;
    district: string;
    dong: string;
    description: string | null;
    imageUrl: string | null;
    satisfactionAvg: number;
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
