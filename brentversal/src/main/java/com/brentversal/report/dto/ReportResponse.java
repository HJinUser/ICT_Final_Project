package com.brentversal.report.dto;

import com.brentversal.member.entity.Member;
import com.brentversal.report.entity.ReportEntity;
import com.brentversal.report.entity.ReportStatus;
import com.brentversal.report.entity.ReportTargetType;

import java.time.LocalDateTime;

public class ReportResponse {

    private final Long id;
    private final Long reporterId;
    private final String reporterName;
    private final ReportTargetType targetType;
    private final Long targetId;
    private final String title;
    private final String content;
    private final ReportStatus status;
    private final String answerContent;
    private final Long processorId;
    private final LocalDateTime processedAt;
    private final LocalDateTime createdAt;

    private ReportResponse(
            Long id,
            Long reporterId,
            String reporterName,
            ReportTargetType targetType,
            Long targetId,
            String title,
            String content,
            ReportStatus status,
            String answerContent,
            Long processorId,
            LocalDateTime processedAt,
            LocalDateTime createdAt
    ) {
        this.id = id;
        this.reporterId = reporterId;
        this.reporterName = reporterName;
        this.targetType = targetType;
        this.targetId = targetId;
        this.title = title;
        this.content = content;
        this.status = status;
        this.answerContent = answerContent;
        this.processorId = processorId;
        this.processedAt = processedAt;
        this.createdAt = createdAt;
    }

    public static ReportResponse from(ReportEntity report) {
        Member processor = report.getProcessor();
        Member reporter = report.getReporter();
        return new ReportResponse(
                report.getId(),
                reporter == null ? null : reporter.getId(),
                reporter == null ? "탈퇴한 회원" : reporter.getName(),
                report.getTargetType(),
                report.getTargetId(),
                report.getTitle(),
                report.getContent(),
                report.getStatus(),
                report.getAnswerContent(),
                processor == null ? null : processor.getId(),
                report.getProcessedAt(),
                report.getCreatedAt()
        );
    }

    public Long getId() {
        return id;
    }

    public Long getReporterId() {
        return reporterId;
    }

    public String getReporterName() {
        return reporterName;
    }

    public ReportTargetType getTargetType() {
        return targetType;
    }

    public Long getTargetId() {
        return targetId;
    }

    public String getTitle() {
        return title;
    }

    public String getContent() {
        return content;
    }

    public ReportStatus getStatus() {
        return status;
    }

    public String getAnswerContent() {
        return answerContent;
    }

    public Long getProcessorId() {
        return processorId;
    }

    public LocalDateTime getProcessedAt() {
        return processedAt;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}
