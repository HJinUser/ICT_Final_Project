import axiosInstance from './axiosInstance';
import type { TagResponse } from '../types/Tag';
import type {
    NeighborhoodListResponse,
    NeighborhoodResponse,
    NeighborhoodSearchParams,
} from '../types/Neighborhood';

export async function getNeighborhoods(
    search: NeighborhoodSearchParams = {},
): Promise<NeighborhoodListResponse> {
    const params = new URLSearchParams();
    if (search.city) params.set('city', search.city);
    if (search.district) params.set('district', search.district);
    if (search.dong) params.set('dong', search.dong);
    if (search.sort) params.set('sort', search.sort);
    if (search.includeHidden) params.set('includeHidden', 'true');
    search.tagIds?.forEach((tagId) => params.append('tagIds', String(tagId)));

    const response = await axiosInstance.get<NeighborhoodListResponse>('/neighborhoods', { params });
    return response.data;
}

export async function getNeighborhood(id: number): Promise<NeighborhoodResponse> {
    const response = await axiosInstance.get<NeighborhoodResponse>(`/neighborhoods/${id}`);
    return response.data;
}

export async function toggleNeighborhoodVisibility(id: number): Promise<NeighborhoodResponse> {
    const response = await axiosInstance.patch<NeighborhoodResponse>(`/neighborhoods/${id}/visibility`);
    return response.data;
}

export async function getNeighborhoodTags(): Promise<TagResponse[]> {
    const response = await axiosInstance.get<TagResponse[]>('/tag');
    return response.data;
}
