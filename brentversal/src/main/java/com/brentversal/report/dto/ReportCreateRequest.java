package com.brentversal.report.dto;

import com.brentversal.report.entity.ReportTargetType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public class ReportCreateRequest {

    @NotNull(message = "신고 대상 유형은 필수입니다.")
    private ReportTargetType targetType;

    @NotNull(message = "신고 대상 번호는 필수입니다.")
    @Positive(message = "신고 대상 번호는 1 이상이어야 합니다.")
    private Long targetId;

    @NotBlank(message = "신고 제목은 필수 입력 사항입니다.")
    @Size(max = 200, message = "신고 제목은 200자 이하로 입력해 주세요.")
    private String title;

    @NotBlank(message = "신고 내용은 필수 입력 사항입니다.")
    private String content;

    public ReportTargetType getTargetType() {
        return targetType;
    }

    public void setTargetType(ReportTargetType targetType) {
        this.targetType = targetType;
    }

    public Long getTargetId() {
        return targetId;
    }

    public void setTargetId(Long targetId) {
        this.targetId = targetId;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }
}
