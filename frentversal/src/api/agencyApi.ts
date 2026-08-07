// 중개사무소 관련 API 호출을 모아 둔 파일
// 화면(AgencyPage.tsx)은 이 파일의 함수만 호출하므로, 서버 주소나 응답 구조가 바뀌어도
// 이 파일만 고치면 되고 화면 코드는 그대로 둘 수 있다.

import customAxios from './axiosInstance';
import type { AgencyListResponse, AgencyResponse } from '../types/Agency';

export interface AgencySearchParams {
    keyword?: string; // 사무소명 또는 공인중개사명
    region?: string;  // 지역(주소에 포함된 문자열, 예: "서초구")
}

// 중개사무소 목록 조회
// GET /agency?keyword=&region=
// 값이 비어 있는 파라미터는 보내지 않는다(서버에서 null 로 받아 조건 없이 처리됨).
export async function getAgencies(params: AgencySearchParams = {}): Promise<AgencyListResponse> {
    const response = await customAxios.get<AgencyListResponse>('/agency', {
        params: {
            keyword: params.keyword?.trim() || undefined,
            region: params.region?.trim() || undefined,
        },
    });

    return response.data;
}

// 중개사무소 1건 조회 (상세 페이지용)
// GET /agency/{id}
export async function getAgency(id: number): Promise<AgencyResponse> {
    const response = await customAxios.get<AgencyResponse>(`/agency/${id}`);

    return response.data;
}
