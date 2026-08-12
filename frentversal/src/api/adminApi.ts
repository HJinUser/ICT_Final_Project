// 관리자 전용 API 호출 모음 (/admin/**)
//
// 이 경로들은 서버에서 관리자(ROLE_ADMIN)만 통과하도록 막아 두었다.
// customAxios 는 baseURL 이 이미 "/api" 라서 그 뒤만 적는다.

import customAxios from './axiosInstance';
import type {
    AdminBroker,
    AdminBrokerListResponse,
    AdminProperty,
    AdminPropertyListResponse,
} from '../types/Admin';

// 매물 목록. status 를 넘기지 않으면 승인 대기(PENDING)만 받는다.
export async function getAdminProperties(status = 'PENDING', page = 0): Promise<AdminPropertyListResponse> {
    const response = await customAxios.get<AdminPropertyListResponse>('/admin/properties', {
        params: { status, page },
    });

    return response.data;
}

// 승인 (승인 대기 -> 게시중). 승인해야 사용자 화면에 노출된다.
export async function approveProperty(id: number): Promise<{ message: string; property: AdminProperty }> {
    const response = await customAxios.patch<{ message: string; property: AdminProperty }>(
        `/admin/properties/${id}/approve`);

    return response.data;
}

// 반려 (승인 대기 -> 등록 취소). 되돌릴 수 없다.
export async function rejectProperty(id: number): Promise<{ message: string; property: AdminProperty }> {
    const response = await customAxios.patch<{ message: string; property: AdminProperty }>(
        `/admin/properties/${id}/reject`);

    return response.data;
}

// ── 중개인 인증 심사 ─────────────────────────────────────────

// 인증 신청 목록. status 를 넘기지 않으면 심사 중(PENDING)만 받는다.
export async function getAdminBrokers(status = 'PENDING', page = 0): Promise<AdminBrokerListResponse> {
    const response = await customAxios.get<AdminBrokerListResponse>('/admin/brokers', {
        params: { status, page },
    });

    return response.data;
}

// 승인 (심사 중 -> 인증 완료). 중개사무소에 인증 마크가 붙는다.
export async function approveBroker(id: number): Promise<{ message: string; broker: AdminBroker }> {
    const response = await customAxios.patch<{ message: string; broker: AdminBroker }>(
        `/admin/brokers/${id}/approve`);

    return response.data;
}

// 반려 (심사 중 -> 미인증). 사유는 중개인 화면에 그대로 보인다.
export async function rejectBroker(id: number, reason: string): Promise<{ message: string; broker: AdminBroker }> {
    const response = await customAxios.patch<{ message: string; broker: AdminBroker }>(
        `/admin/brokers/${id}/reject`, { reason });

    return response.data;
}
