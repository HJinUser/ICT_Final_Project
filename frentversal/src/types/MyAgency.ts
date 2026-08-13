// 중개인 전용 화면(내 중개사무소, 중개인 마이페이지, 답변하기, 인증 신청)에서 쓰는 타입 모음
// 백엔드의 DTO 와 1:1로 맞춰 두었으므로, 서버 필드가 바뀌면 이 파일도 함께 바꾼다.

// ── 대시보드 (MyAgencyDashboardDto) ──────────────────────────
export interface MyAgencyDashboard {
    totalCount: number;       // 등록 매물 수 (상태와 상관없이 전체)
    activeCount: number;      // 게시 중 매물
    inProgressCount: number;  // 거래 진행 중
    completedCount: number;   // 거래 완료
    pendingCount: number;     // 승인 대기

    requestedConsultationCount: number; // 상담 요청 (아직 답변 안 함, 알림 배지 숫자)
    acceptedConsultationCount: number;  // 상담 확정
    doneConsultationCount: number;      // 상담 완료

    ratingAvg: number;             // 평균 평점
    reviewCount: number;           // 전체 리뷰 수
    unansweredReviewCount: number; // 미답변 리뷰 수
}

// ── 내 등록 매물 카드 (MyPropertyCardDto) ────────────────────
export interface MyPropertyCard {
    id: number;
    name: string;
    type: string;
    typeLabel: string;    // 아파트 / 원투룸 ...
    dealType: string;
    priceLabel: string;   // "전세 4억 9,000"
    address: string;
    area: string | null;  // "84㎡"
    floor: number | null;
    status: string;
    statusLabel: string;  // 게시중 / 거래 진행중 ...
    visible: boolean;
    createdAt: string;    // "2026-08-10"
}

// 목록 API 의 공통 응답 형태 (페이징)
export interface PagedResponse<T> {
    content: T[];
    page: number;       // 현재 페이지 (0부터)
    totalPages: number; // 전체 페이지 수
    totalCount: number; // 전체 건수
}

// ── 상담(문의) (ConsultationResponseDto) ─────────────────────
// 상담 진행 순서 : 상담 요청 -> 상담 확정 -> 상담 완료 (중간에 종료 가능)
export type ConsultationStatus = 'REQUESTED' | 'ACCEPTED' | 'DONE' | 'CLOSED';

export interface Consultation {
    id: number;
    memberName: string | null;   // 요청한 사람 (중개인이 직접 연락해야 하므로 연락처까지 받는다)
    memberPhone: string | null;
    memberEmail: string | null;
    propertyId: number | null;
    content: string;
    preferredDate: string | null; // "2026-08-11"
    createdAt: string;            // "2026-08-10 16:43"
    status: ConsultationStatus;
    statusLabel: string;
    reply: string | null;         // 중개인이 보낸 답변 (아직이면 null)
    repliedAt: string | null;
}

// 알림 타입은 역할 공용이라 types/Notification.ts 로 옮겼다.

// ── 중개인 인증 신청 (BrokerVerificationDto) ─────────────────
export type VerifyStatus = 'UNVERIFIED' | 'PENDING' | 'VERIFIED';

export interface BrokerVerification {
    licenseNumber: string | null;   // 등록번호
    businessName: string | null;    // 상호
    officeAddress: string | null;   // 소재지
    ownerName: string | null;       // 대표자
    registeredDate: string | null;  // 등록일 "2024-05-20"
    licenseImageUrl: string | null; // 업로드한 자격증 사진
    verifyStatus: VerifyStatus;
    verifyStatusLabel: string;      // 미인증 / 심사 중 / 인증 완료
    rejectReason: string | null;
    submittedAt: string | null;
}
