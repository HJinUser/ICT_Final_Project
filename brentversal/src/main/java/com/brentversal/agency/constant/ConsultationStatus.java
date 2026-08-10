package com.brentversal.agency.constant;

// 상담 요청의 진행 상태를 나타내는 열거형 상수
//
// 중개인 마이페이지의 "문의 관리" 필터(전체 / 답변 대기 / 답변 완료 / 종료)와 그대로 짝을 이룬다.
// 사용자가 상담을 요청하면 WAITING 으로 저장되고,
// 중개인이 답변을 보내면 ANSWERED, 더 이상 진행하지 않기로 하면 CLOSED 가 된다.
public enum ConsultationStatus {
    WAITING("답변 대기"),   // 사용자가 요청을 보냈고 중개인이 아직 답변하지 않은 상태
    ANSWERED("답변 완료"),  // 중개인이 답변을 보낸 상태
    CLOSED("종료");         // 상담이 끝났거나 취소된 상태

    // 화면에 그대로 보여 줄 한글 라벨.
    // 색상 같은 표현은 서버가 아니라 프론트에서 정한다.
    private final String label;

    ConsultationStatus(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }
}
