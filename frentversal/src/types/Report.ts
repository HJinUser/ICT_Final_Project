export type ReportStatus = 'PENDING' | 'RESOLVED' | 'REJECTED';
export type ReportTargetType = 'PROPERTY' | 'REVIEW';

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
