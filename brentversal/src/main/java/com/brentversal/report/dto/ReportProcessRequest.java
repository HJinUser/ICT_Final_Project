package com.brentversal.report.dto;

import com.brentversal.report.entity.ReportStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class ReportProcessRequest {

    @NotNull(message = "처리 상태는 필수입니다.")
    private ReportStatus status;

    @NotBlank(message = "처리 답변은 필수 입력 사항입니다.")
    private String answerContent;

    public ReportStatus getStatus() {
        return status;
    }

    public void setStatus(ReportStatus status) {
        this.status = status;
    }

    public String getAnswerContent() {
        return answerContent;
    }

    public void setAnswerContent(String answerContent) {
        this.answerContent = answerContent;
    }
}
