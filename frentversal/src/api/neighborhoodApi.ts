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

/*
  이 법정동 동네에 대응하는 행정동 AI 분석 결과를 가져온다.

  동네 탐색은 법정동, K-Means 는 행정동 기준이라 서버가 (자치구, 법정동) 이름으로
  매핑표를 거쳐 찾아 준다. 매핑이 없는 동네는 404가 온다 — 호출한 쪽에서 잡아서
  "AI 분석 준비 중"으로 처리하고, 나머지 동네 정보는 그대로 보여 주면 된다.
*/
export async function getMlAnalysisForNeighborhood(id: number): Promise<MlNeighborhoodResponse> {
    const response = await axiosInstance.get<MlNeighborhoodResponse>(`/neighborhoods/${id}/ml`);
    return response.data;
}
