import axiosInstance from './axiosInstance';
import type { NearbyPlaceResponse } from '../types/NearbyPlace';

/*
  매물 주변시설(지하철·버스·병원·편의점)을 가져온다.

  좌표를 보내지 않고 매물 id 만 넘긴다. 서버가 저장된 매물의 좌표를 쓰기 때문이다.
  좌표가 없는 매물이거나 파이썬이 꺼져 있으면 서버가 빈 객체를 준다.
*/
export async function getNearbyPlaces(propertyId: number): Promise<NearbyPlaceResponse> {
    const response = await axiosInstance.get<NearbyPlaceResponse>(`/property/${propertyId}/nearby`);
    return response.data;
}
