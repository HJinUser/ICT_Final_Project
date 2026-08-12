// 사용자가 자기가 보낸 상담과 받은 답변을 확인하는 API (/my-consultations)
//
// 로그인만 하면 누구나 쓸 수 있다. 상담은 누구나 보낼 수 있고,
// 보낸 사람은 자기 상담을 볼 수 있어야 하기 때문이다.

import customAxios from './axiosInstance';
import type { MyConsultation, MyConsultationListResponse } from '../types/Consultation';

// 내가 보낸 상담 목록 (최신순)
export async function getMyConsultations(): Promise<MyConsultationListResponse> {
    const response = await customAxios.get<MyConsultationListResponse>('/my-consultations');

    return response.data;
}

// 답변 확인 처리.
// 답변을 펼쳐 볼 때 부르며, 이 시점부터 헤더 알림에서 사라진다.
export async function checkConsultationReply(id: number): Promise<MyConsultation> {
    const response = await customAxios.patch<{ message: string; consultation: MyConsultation }>(
        `/my-consultations/${id}/check`);

    return response.data.consultation;
}
