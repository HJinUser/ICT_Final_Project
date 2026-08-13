package com.brentversal.report.dto;

import com.brentversal.report.entity.ReportEntity;
import com.brentversal.report.entity.ReportStatus;
import com.brentversal.report.entity.ReportTargetType;

import java.time.LocalDateTime;

/**
 * 누구나 확인할 수 있는 신고 처리 내역이다.
 * 신고자, 대상 번호, 제목, 신고 내용, 관리자 답변은 의도적으로 포함하지 않는다.
 */
public class PublicReportResponse {

    private final Long id;
    private final ReportTargetType targetType;
    private final ReportStatus status;
    private final LocalDateTime createdAt;
    private final LocalDateTime processedAt;

    private PublicReportResponse(
            Long id,
            ReportTargetType targetType,
            ReportStatus status,
            LocalDateTime createdAt,
            LocalDateTime processedAt
    ) {
        this.id = id;
        this.targetType = targetType;
        this.status = status;
        this.createdAt = createdAt;
        this.processedAt = processedAt;
    }

    public static PublicReportResponse from(ReportEntity report) {
        return new PublicReportResponse(
                report.getId(),
                report.getTargetType(),
                report.getStatus(),
                report.getCreatedAt(),
                report.getProcessedAt()
        );
    }

    public Long getId() {
        return id;
    }

    public ReportTargetType getTargetType() {
        return targetType;
    }

    public ReportStatus getStatus() {
        return status;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getProcessedAt() {
        return processedAt;
    }
}
