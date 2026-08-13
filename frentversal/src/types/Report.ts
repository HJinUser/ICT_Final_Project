export type ReportStatus = 'PENDING' | 'RESOLVED' | 'REJECTED';
export type ReportTargetType = 'PROPERTY' | 'AGENCY' | 'REVIEW';

export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
    PENDING: '검토 중',
    RESOLVED: '적용',
    REJECTED: '취소 처리',
};

export const REPORT_TARGET_LABELS: Record<ReportTargetType, string> = {
    PROPERTY: '매물',
    AGENCY: '중개사무소',
    REVIEW: '리뷰',
};

export interface Report {
    id: number;
    reporterId: number;
    reporterName: string;
    targetType: ReportTargetType;
    targetId: number;
    title: string;
    content: string;
    status: ReportStatus;
    answerContent: string | null;
    processorId: number | null;
    processedAt: string | null;
    createdAt: string;
}

export interface ReportCreatePayload {
    targetType: ReportTargetType;
    targetId: number;
    title: string;
    content: string;
}

export interface ReportProcessPayload {
    status: Exclude<ReportStatus, 'PENDING'>;
    answerContent: string;
}

// 공개 신고 처리 내역. 신고자·대상 번호·신고 내용·답변은 서버가 내려주지 않는다.
export interface PublicReport {
    id: number;
    targetType: ReportTargetType;
    status: ReportStatus;
    createdAt: string;
    processedAt: string | null;
}
