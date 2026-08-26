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
    thumbnailUrl: string | null; // 대표 사진. 없으면 null
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

// ── 중개인 홈 인사이트 (MyAgencyInsightsDto) ─────────────────
//
// 메인 화면 "처리할 내 매물" 아래 두 칸(매물 반응 추이 · 머신러닝 평가)이 함께 쓴다.
// 두 칸 모두 "내 사무소" 라는 같은 기준으로 모으는 자료라 서버가 한 번에 내려 준다.

/*
  월별 반응 한 칸.

  화면정의서에는 "월별 조회수"로 적혀 있지만 매물을 몇 번 열었는지는 서버가 남기지 않는다
  (조회수 컬럼도, 열람 기록 테이블도 없다). 대신 사용자가 매물에 남긴 행동에는 시각이
  함께 저장돼 있어서, 그 셋을 합쳐 "반응"으로 보여 준다.
*/
export interface MonthlyReaction {
    month: string; // "2026-08"
    label: string; // "8월"

    favoriteCount: number;     // 관심 등록
    feedbackCount: number;     // 추천 평가 (좋아요 + 싫어요)
    consultationCount: number; // 상담 요청

    total: number; // 위 셋의 합
}

// 싫어요 비중이 높은 매물 한 건 (FeedbackPropertyDto)
export interface FeedbackProperty {
    propertyId: number;
    name: string;
    dealType: string | null;
    statusLabel: string | null;

    likeCount: number;
    dislikeCount: number;
    totalCount: number;
    dislikeRatio: number; // 싫어요 비중(%)

    priceLabel: string;                  // 지금 호가
    suggestedPriceLabel: string | null;  // AI 예상 시세(권장 호가). 예측 전이면 null

    // 호가가 예상 시세보다 몇 % 높은지(양수) 또는 낮은지(음수). 비교할 수 없으면 null
    gapPercent: number | null;
}

// 오래 남아 있는 매물 한 건 (StalePropertyDto)
export interface StaleProperty {
    propertyId: number;
    name: string;
    priceLabel: string;
    statusLabel: string;

    createdAt: string;    // "2026-07-02"
    daysOnMarket: number; // 등록일로부터 며칠

    favoriteCount: number;
    dislikeCount: number;
}

export interface MyAgencyInsights {
    trend: MonthlyReaction[];
    trendTotal: number;
    trendMonths: number;

    likeCount: number;
    dislikeCount: number;
    feedbackTotal: number;
    likeRatio: number; // 좋아요 비중(%)

    dislikedProperties: FeedbackProperty[];
    staleProperties: StaleProperty[];
}
