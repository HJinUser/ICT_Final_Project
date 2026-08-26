// 관리자가 중개인에게 보내는 "매물 수정 요청" 타입
//
// 백엔드 editrequest 도메인(PropertyEditRequestDto, EditRequestStatus)과 1:1로 맞춰 두었다.
// 관리자 화면(보낸 요청 이력)과 중개인 화면(받은 요청)이 같은 내용을 보므로 타입도 하나만 쓴다.

export type EditRequestStatusCode = 'REQUESTED' | 'RESOLVED';

export type PropertyEditRequest = {
    id: number;

    propertyId: number;
    propertyName: string;

    agencyId: number | null;
    agencyName: string | null;

    requesterName: string; // 요청을 보낸 관리자 이름

    reason: string;

    status: EditRequestStatusCode;
    statusLabel: string; // "처리 대기" / "처리 완료"

    createdAt: string;
    resolvedAt: string | null; // 아직 처리 전이면 null
};

// 관리자가 수정 요청을 보낼 때 서버로 나가는 본문
export type PropertyEditRequestCreateRequest = {
    reason: string;
};

// 상태별 배지 색 (common.css 의 .status.*)
export const EDIT_REQUEST_STATUS_COLORS: Record<EditRequestStatusCode, string> = {
    REQUESTED: 'orange',
    RESOLVED: 'green',
};
