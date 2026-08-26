package com.brentversal.report.entity;

import com.brentversal.member.entity.Member;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Lob;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "reports",
        indexes = {
                @Index(name = "idx_report_status_created", columnList = "status, created_at"),
                @Index(name = "idx_report_target", columnList = "target_type, target_id")
        }
)
public class ReportEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "report_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reporter_id", nullable = true)
    private Member reporter;

    @Enumerated(EnumType.STRING)
    @Column(name = "target_type", nullable = false, length = 20)
    private ReportTargetType targetType;

    @Column(name = "target_id", nullable = false)
    private Long targetId;

    @Column(nullable = false, length = 200)
    private String title;

    @Lob
    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ReportStatus status;

    @Lob
    @Column(name = "answer_content", columnDefinition = "TEXT")
    private String answerContent;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "processor_id")
    private Member processor;

    @Column(name = "processed_at")
    private LocalDateTime processedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    protected ReportEntity() {
    }

    private ReportEntity(
            Member reporter,
            ReportTargetType targetType,
            Long targetId,
            String title,
            String content
    ) {
        this.reporter = reporter;
        this.targetType = targetType;
        this.targetId = targetId;
        this.title = title;
        this.content = content;
        this.status = ReportStatus.PENDING;
    }

    public static ReportEntity create(
            Member reporter,
            ReportTargetType targetType,
            Long targetId,
            String title,
            String content
    ) {
        return new ReportEntity(reporter, targetType, targetId, title, content);
    }

    public void process(
            ReportStatus nextStatus,
            String answerContent,
            Member processor
    ) {
        if (this.status != ReportStatus.PENDING) {
            throw new IllegalStateException("이미 처리된 신고입니다.");
        }
        if (nextStatus == ReportStatus.PENDING) {
            throw new IllegalArgumentException("처리 상태는 RESOLVED 또는 REJECTED여야 합니다.");
        }

        this.status = nextStatus;
        this.answerContent = answerContent;
        this.processor = processor;
        this.processedAt = LocalDateTime.now();
    }

    @PrePersist
    private void onCreate() {
        this.createdAt = LocalDateTime.now();
        if (this.status == null) {
            this.status = ReportStatus.PENDING;
        }
    }

    public Long getId() {
        return id;
    }

    public Member getReporter() {
        return reporter;
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

    public Member getProcessor() {
        return processor;
    }

    public LocalDateTime getProcessedAt() {
        return processedAt;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    // 신고자가 탈퇴했을 때 신고 내용은 남기고 작성자 연결만 끊는다.
    public void detachReporter() {
        this.reporter = null;
    }
}
