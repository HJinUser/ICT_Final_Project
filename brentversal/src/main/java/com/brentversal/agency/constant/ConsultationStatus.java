package com.brentversal.agency.constant;

// 상담 요청의 진행 상태를 나타내는 열거형 상수
// 사용자가 상담 요청을 보내면 REQUESTED 로 저장되고, 이후 중개인이 상태를 바꾼다.
public enum ConsultationStatus {
    REQUESTED("요청됨"),   // 사용자가 요청을 보낸 상태
    ACCEPTED("상담 확정"), // 중개인이 요청을 확인하고 일정을 확정한 상태
    DONE("상담 완료"),     // 상담이 끝난 상태
    CANCELED("취소됨");    // 사용자 또는 중개인이 취소한 상태

    private final String label;

    ConsultationStatus(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }
}
