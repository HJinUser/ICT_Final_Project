package com.brentversal.inquiry.constant;

public enum InquiryStatus {
    PENDING("답변 대기"),
    ANSWERED("답변 완료");

    private final String label;

    InquiryStatus(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }
}
