// 관리자 전용 API 호출 모음 (/admin/**)
//
// 이 경로들은 서버에서 관리자(ROLE_ADMIN)만 통과하도록 막아 두었다.
// customAxios 는 baseURL 이 이미 "/api" 라서 그 뒤만 적는다.

import customAxios from './axiosInstance';
import type {
    AdminBroker,
    AdminBrokerListResponse,
    AdminMlStatus,
    AdminProperty,
    AdminPropertyListResponse,
    MemberStats,
} from '../types/Admin';
import type { PropertyEditRequest } from '../types/PropertyEditRequest';

export type PriceEvaluationStatus =
    | "UNDERVALUED"
    | "FAIR"
    | "OVERVALUED";

// 매물 목록. status 를 넘기지 않으면 승인 대기(PENDING)만 받는다.
export async function getAdminProperties(status = 'PENDING', page = 0): Promise<AdminPropertyListResponse> {
    const response = await customAxios.get<AdminPropertyListResponse>('/admin/properties', {
        params: { status, page },
    });

    return response.data;
}

// 관리자 가격평가 상태를 Spring API에 전송하고 갱신된 매물 정보를 반환하는 함수임
export async function evaluatePropertyPrice(
    id: number,
    status: PriceEvaluationStatus,
): Promise<{ message: string; property: AdminProperty }> {
    // 선택한 관리자 가격평가 상태를 해당 매물의 price-evaluation API에 PATCH 요청함
    const response = await customAxios.patch<{
        message: string;
        property: AdminProperty;
    }>(
        `/admin/properties/${id}/price-evaluation`,
        { status },
    );

    // 계산 또는 렌더링할 최종 결과를 반환함
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

// 등록 취소 (게시중이든 승인 대기든 관리자가 매물을 내린다). 되돌릴 수 없다.
//
// 반려(rejectProperty)와 결과는 같지만 대상이 다르다.
//   반려     : 승인 대기 매물을 게시하지 않기로 하는 심사 결과
//   등록 취소 : 이미 게시 중인 매물까지 포함해 관리자가 내리는 것
export async function cancelProperty(id: number): Promise<{ message: string; property: AdminProperty }> {
    const response = await customAxios.patch<{ message: string; property: AdminProperty }>(
        `/admin/properties/${id}/cancel`);

    return response.data;
}

// ── 매물 수정 요청 (관리자 -> 중개인) ───────────────────────────

// 수정 요청 보내기. 사유는 중개인 화면과 안내 메일에 그대로 보인다.
export async function createPropertyEditRequest(
    id: number,
    reason: string,
): Promise<{ message: string; editRequest: PropertyEditRequest }> {
    const response = await customAxios.post<{ message: string; editRequest: PropertyEditRequest }>(
        `/admin/properties/${id}/edit-request`, { reason });

    return response.data;
}

// 그 매물에 지금까지 보낸 수정 요청 이력 (최신순)
export async function getPropertyEditRequests(id: number): Promise<PropertyEditRequest[]> {
    const response = await customAxios.get<PropertyEditRequest[]>(
        `/admin/properties/${id}/edit-requests`);

    return response.data;
}

export async function hideProperty(id: number): Promise<{ message: string; property: AdminProperty }> {
    const response = await customAxios.patch<{ message: string; property: AdminProperty }>(
        `/admin/properties/${id}/hide`);
    return response.data;
}

export async function unhideProperty(id: number): Promise<{ message: string; property: AdminProperty }> {
    const response = await customAxios.patch<{ message: string; property: AdminProperty }>(
        `/admin/properties/${id}/unhide`);
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

// ── 모델 관리 ────────────────────────────────────────────────

// 시세예측·추천·동네 군집·텍스트마이닝 모델의 현재 상태를 한 번에 받는다.
export async function getAdminMlStatus(): Promise<AdminMlStatus> {
    const response = await customAxios.get<AdminMlStatus>('/admin/ml/status');

    return response.data;
}

// ── 회원 통계 (관리자 홈) ────────────────────────────────────

// 전체 회원 수 · 이번 달 신규 가입 · 역할 비중 · 월별 가입 추이
export async function getMemberStats(): Promise<MemberStats> {
    const response = await customAxios.get<MemberStats>('/admin/members/stats');

    return response.data;
}
