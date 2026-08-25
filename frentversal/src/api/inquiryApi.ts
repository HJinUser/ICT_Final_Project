import customAxios from './axiosInstance';
import type { InquiryCreateRequest } from '../types/Inquiry';

// 매물 상세에서 중개사무소로 문의를 보낸다.
// POST /inquiry (로그인 필요)
export async function sendInquiry(payload: InquiryCreateRequest): Promise<string> {
    const response = await customAxios.post<{ message: string }>('/inquiry', payload);
    return response.data.message;
}