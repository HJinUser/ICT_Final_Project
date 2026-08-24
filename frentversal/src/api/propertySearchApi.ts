// 지도 검색 API (/property/search)
//
// 비회원도 쓸 수 있다. 다만 중개인이 "내 매물"만 볼 때는 서버가 로그인한 사람의 사무소로 걸러 준다.

import customAxios from './axiosInstance';
import type {
    PropertyListingsParams,
    PropertyListingsResponse,
    PropertySearchParams,
    PropertySearchResponse
} from '../types/PropertySearch';

export async function searchProperties(params: PropertySearchParams = {}): Promise<PropertySearchResponse> {
    const response = await customAxios.get<PropertySearchResponse>('/property/search', {
        // 값이 비어 있는 조건은 아예 보내지 않는다 (서버에서 "고르지 않음"으로 처리된다)
        params: {
            keyword: params.keyword || undefined,
            region: params.region || undefined,
            dong: params.dong || undefined,
            adminCode: params.adminCode || undefined,
            type: params.type && params.type !== 'ALL' ? params.type : undefined,
            dealType: params.dealType && params.dealType !== 'ALL' ? params.dealType : undefined,
            minPrice: params.minPrice ?? undefined,
            maxPrice: params.maxPrice ?? undefined,
            minArea: params.minArea ?? undefined,
            maxArea: params.maxArea ?? undefined,
            roomCounts: params.roomCounts?.length ? params.roomCounts : undefined,
            tagIds: params.tagIds?.length ? params.tagIds : undefined,
            mine: params.mine ? true : undefined,
            sort: params.sort || undefined,
        },

        // 배열은 roomCounts=1&roomCounts=2 형태로 보낸다.
        // 기본값(roomCounts[]=1)으로 보내면 스프링이 이름을 못 알아본다.
        paramsSerializer: { indexes: null },
    });

    return response.data;
}

export async function fetchListings(params: PropertyListingsParams = {}): Promise<PropertyListingsResponse> {
    const response = await customAxios.get<PropertyListingsResponse>('/property/listings', {
        params: {
            type: params.type && params.type !== 'ALL' ? params.type : undefined,
            dealType: params.dealType && params.dealType !== 'ALL' ? params.dealType : undefined,
            sort: params.sort || undefined,
            page: params.page ?? 0,
            size: params.size ?? 6,
        },
    });

    return response.data;
}

// 매물유형에 실제로 존재하는 거래유형 목록 (/property/deal-types). 거래유형 칩을 채우는 데 쓴다.
export async function fetchAvailableDealTypes(type?: string): Promise<string[]> {
    const response = await customAxios.get<string[]>('/property/deal-types', {
        params: { type: type && type !== 'ALL' ? type : undefined },
    });

    return response.data;
}