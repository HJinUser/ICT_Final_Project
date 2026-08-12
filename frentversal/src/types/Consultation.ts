// 사용자가 보는 "내 상담" 타입
// 백엔드의 MyConsultationDto 와 1:1로 맞춰 두었다.
//
// 중개인이 보는 타입(types/MyAgency.ts 의 Consultation)과 담는 값이 다르다.
// 중개인은 "누가 보냈는지", 사용자는 "어느 사무소에 보냈고 답변이 왔는지"가 필요하다.

export type ConsultationStatus = 'REQUESTED' | 'ACCEPTED' | 'DONE' | 'CLOSED';

export interface MyConsultation {
    id: number;

    // 상담을 보낸 중개사무소
    agencyId: number | null;
    agencyName: string | null;
    brokerName: string | null;
    agencyPhone: string | null; // 답변을 받은 뒤 직접 연락할 때 쓴다

    propertyId: number | null;    // 문의한 매물 (안 고르면 null)
    preferredDate: string | null; // 상담 희망일 "2026-09-01"
    content: string;              // 내가 보낸 문의 내용

    status: ConsultationStatus;
    statusLabel: string; // 상담 요청 / 상담 확정 / 상담 완료 / 종료

    reply: string | null;     // 중개인이 보낸 답변 (아직 없으면 null)
    replyChecked: boolean;    // 내가 이 답변을 확인했는지 (알림 표시 기준)
    repliedAt: string | null; // "2026-08-12 14:30"
    createdAt: string;
}

export interface MyConsultationListResponse {
    content: MyConsultation[];
    totalCount: number;
}
