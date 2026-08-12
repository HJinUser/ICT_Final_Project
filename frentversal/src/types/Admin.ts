// 관리자 전용 화면(매물 관리)에서 쓰는 타입 모음
// 백엔드의 AdminPropertyDto 와 1:1로 맞춰 두었으므로, 서버 필드가 바뀌면 이 파일도 함께 바꾼다.

// ── 관리자 매물 카드 (AdminPropertyDto) ──────────────────────
export interface AdminProperty {
    id: number;
    name: string;
    typeLabel: string;   // 아파트 / 원투룸 ...
    priceLabel: string;  // "전세 4억 9,000"
    address: string;
    area: string | null; // "84㎡"
    floor: number | null;
    status: string;      // PENDING / ACTIVE / ...
    statusLabel: string; // 승인 대기 / 게시중 ...

    // 어느 사무소가 올렸는지 (승인 판단에 쓴다)
    agencyId: number | null;
    agencyName: string | null;
    brokerName: string | null;
    agencyVerified: boolean;

    createdAt: string; // "2026-08-12"
}

// 매물 목록 응답. 목록 외에 승인 대기 건수도 함께 내려온다.
export interface AdminPropertyListResponse {
    content: AdminProperty[];
    page: number;       // 현재 페이지 (0부터)
    totalPages: number;
    totalCount: number;
    pendingCount: number; // 상단 요약에 쓰는 승인 대기 건수
}

// ── 중개인 인증 신청 (AdminBrokerDto) ────────────────────────
export interface AdminBroker {
    id: number; // 중개인(broker) id — 승인·반려할 때 쓴다

    // 신청한 사람
    memberName: string | null;
    memberEmail: string | null;
    memberPhone: string | null;

    // 중개인이 제출한 인증 정보
    licenseNumber: string | null;   // 등록번호
    businessName: string | null;    // 상호
    officeAddress: string | null;   // 소재지
    ownerName: string | null;       // 대표자
    licenseImageUrl: string | null; // 자격증 사진
    registeredDate: string | null;  // "2024-05-20"

    // 심사 상태
    verifyStatus: string;      // UNVERIFIED / PENDING / VERIFIED
    verifyStatusLabel: string; // 미인증 / 심사 중 / 인증 완료
    rejectReason: string | null;
    submittedAt: string | null; // "2026-08-12 14:30"
    reviewedAt: string | null;

    // 연결된 중개사무소
    agencyId: number | null;
    agencyName: string | null;
    agencyAddress: string | null;
    agencyVerified: boolean;
}

export interface AdminBrokerListResponse {
    content: AdminBroker[];
    page: number;
    totalPages: number;
    totalCount: number;
    pendingCount: number; // 심사 대기 건수
}
