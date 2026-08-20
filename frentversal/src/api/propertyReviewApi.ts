import axiosInstance from './axiosInstance';
import type { Review } from '../types/Review';

/*
  매물 한줄평.

  목록 조회는 비회원도 볼 수 있고, 작성은 로그인한 일반 사용자만 할 수 있다.
  같은 매물에 이미 쓴 글이 있으면 새로 만들지 않고 그 글을 고친다.
*/

export async function getPropertyReviews(propertyId: number): Promise<Review[]> {
    const response = await axiosInstance.get<Review[]>(`/property/${propertyId}/reviews`);
    return response.data;
}

export type PropertyReviewPayload = {
    rating: number;
    content: string;
};

export async function savePropertyReview(
    propertyId: number,
    payload: PropertyReviewPayload,
): Promise<Review> {
    const response = await axiosInstance.post<Review>(`/property/${propertyId}/reviews`, payload);
    return response.data;
}
