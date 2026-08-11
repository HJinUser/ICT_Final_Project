package com.brentversal.agency.constant;

// 상담 요청의 진행 상태를 나타내는 열거형 상수
//
// 상담이 진행되는 순서를 그대로 담았다.
//   상담 요청 -> 상담 확정 -> 상담 완료
// 중간에 진행하지 않기로 하면 어느 단계에서든 종료가 될 수 있다.
//
// 중개인 마이페이지의 "문의 관리" 필터(전체 / 상담 요청 / 상담 확정 / 상담 완료 / 종료)와 짝을 이룬다.
public enum ConsultationStatus {
    REQUESTED("상담 요청"),  // 사용자가 요청을 보냈고 중개인이 아직 답변하지 않은 상태
    ACCEPTED("상담 확정"),   // 중개인이 답변을 보내 일정이 잡힌 상태
    DONE("상담 완료"),       // 상담이 끝난 상태
    CLOSED("종료");          // 진행하지 않기로 했거나 취소된 상태

    // 화면에 그대로 보여 줄 한글 라벨.
    // 배지 색상 같은 표현은 서버가 아니라 프론트에서 정한다.
    private final String label;

    ConsultationStatus(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }
}
