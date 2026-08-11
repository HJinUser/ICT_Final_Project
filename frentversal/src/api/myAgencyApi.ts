// 중개인 전용 API 호출 모음 (/my-agency/**)
//
// 이 경로들은 서버에서 중개인(ROLE_BROKER)만 통과하도록 막아 두었다.
// 사무소 번호를 보내지 않는 이유는, 서버가 로그인한 사람의 사무소를 직접 찾기 때문이다.

import customAxios from './axiosInstance';
import type { AgencyDetail, AgencyReview } from '../types/Agency';
import type {
    Consultation,
    ConsultationStatus,
    MyAgencyDashboard,
    MyPropertyCard,
    NotificationResponse,
    PagedResponse,
} from '../types/MyAgency';

// 내 중개사무소 정보 (중개사무소 상세와 같은 내용)
export async function getMyAgency(): Promise<AgencyDetail> {
    const response = await customAxios.get<AgencyDetail>('/my-agency');

    return response.data;
}

// 사무소 정보 수정 저장
export async function updateMyAgency(agency: Partial<AgencyDetail>): Promise<string> {
    const response = await customAxios.put<{ message: string }>('/my-agency', agency);

    return response.data.message;
}

// 상단 요약(대시보드) 숫자
export async function getDashboard(): Promise<MyAgencyDashboard> {
    const response = await customAxios.get<MyAgencyDashboard>('/my-agency/dashboard');

    return response.data;
}

// 내가 등록한 매물 (한 페이지 6개 = 2행 3열)
export async function getMyProperties(page = 0): Promise<PagedResponse<MyPropertyCard>> {
    const response = await customAxios.get<PagedResponse<MyPropertyCard>>('/my-agency/properties', {
        params: { page },
    });

    return response.data;
}

// 문의(상담) 목록. status 를 넘기지 않으면 전체를 받는다.
export async function getConsultations(status?: string): Promise<Consultation[]> {
    const response = await customAxios.get<Consultation[]>('/my-agency/consultations', {
        params: { status: status && status !== 'ALL' ? status : undefined },
    });

    return response.data;
}

// 문의 1건 (답변하기 페이지)
export async function getConsultation(id: number): Promise<Consultation> {
    const response = await customAxios.get<Consultation>(`/my-agency/consultations/${id}`);

    return response.data;
}

// 답변 보내기
export async function replyToConsultation(id: number, reply: string): Promise<string> {
    const response = await customAxios.post<{ message: string }>(
        `/my-agency/consultations/${id}/reply`, { reply });

    return response.data.message;
}

// 상담 상태 변경 (상담 완료 / 종료 처리)
// status : ACCEPTED(상담 확정) / DONE(상담 완료) / CLOSED(종료)
export async function updateConsultationStatus(id: number, status: ConsultationStatus): Promise<string> {
    const response = await customAxios.patch<{ message: string }>(
        `/my-agency/consultations/${id}/status`, { status });

    return response.data.message;
}

// 리뷰 목록 (한 페이지 10개). filter : ALL / UNANSWERED / ANSWERED
export async function getMyReviews(filter = 'ALL', page = 0): Promise<PagedResponse<AgencyReview>> {
    const response = await customAxios.get<PagedResponse<AgencyReview>>('/my-agency/reviews', {
        params: { filter, page },
    });

    return response.data;
}

// 리뷰에 답변 달기
export async function replyToReview(id: number, reply: string): Promise<string> {
    const response = await customAxios.post<{ message: string }>(`/my-agency/reviews/${id}/reply`, { reply });

    return response.data.message;
}

// 알림 목록 (헤더 종 아이콘)
// 사무소가 아직 없거나 오류가 나면 빈 목록으로 처리해서 헤더가 깨지지 않게 한다.
export async function getNotifications(): Promise<NotificationResponse> {
    try {
        const response = await customAxios.get<NotificationResponse>('/my-agency/notifications');
        return response.data;
    } catch {
        return { content: [], unreadCount: 0 };
    }
}
