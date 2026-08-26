// 매물 상세 "AI 시세예측" 그래프 API (/property/{id}/price-trend)
//
// 비회원도 보는 화면이라 로그인을 요구하지 않는다.
// customAxios 는 baseURL 이 이미 "/api" 라서 그 뒤만 적는다.

import customAxios from './axiosInstance';
import type { PropertyPriceTrend } from '../types/PropertyPriceTrend';

export async function getPropertyPriceTrend(id: number): Promise<PropertyPriceTrend> {
    const response = await customAxios.get<PropertyPriceTrend>(`/property/${id}/price-trend`);

    return response.data;
}
