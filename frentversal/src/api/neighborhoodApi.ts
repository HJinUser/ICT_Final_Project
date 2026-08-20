import axiosInstance from './axiosInstance';
import type { TagResponse } from '../types/Tag';
import type { MlNeighborhoodResponse } from '../types/MlNeighborhood';
import type {
    NeighborhoodCreatePayload,
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

// 관리자 "동네 등록". 시세·인기도는 서버가 매물/찜을 집계해서 채우므로 여기서 보내지 않는다.
export async function createNeighborhood(payload: NeighborhoodCreatePayload): Promise<NeighborhoodResponse> {
    const response = await axiosInstance.post<NeighborhoodResponse>('/neighborhoods', payload);
    return response.data;
}

/*
  행정동 ML 분석(K-Means 군집 / 키워드) 결과를 가져온다.

  adminCode 는 행정동 코드라서 위의 getNeighborhood(id) 가 쓰는 법정동 번호와 다르다.
  React 가 파이썬(FastAPI)을 직접 부르지 않고 Spring 이 대신 받아 전달한다.
*/
export async function getMlNeighborhood(adminCode: string): Promise<MlNeighborhoodResponse> {
    const response = await axiosInstance.get<MlNeighborhoodResponse>(
        `/neighborhoods/ml/${encodeURIComponent(adminCode)}`,
    );
    return response.data;
}
