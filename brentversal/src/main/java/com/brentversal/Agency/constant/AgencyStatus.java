package com.brentversal.Agency.constant;

// 중개사무소의 상담 가능 여부를 나타내는 열거형 상수
// 프론트엔드(AgencyPage.tsx)의 카드 상단 배지에 표시된다.
// ERD 에는 없는 컬럼이지만, 화면에 "상담 가능 / 예약 상담" 배지가 있어서 추가했다.
public enum AgencyStatus {
    AVAILABLE("상담 가능"),   // 바로 상담 가능 (초록 배지)
    RESERVED("예약 상담"),    // 예약해야 상담 가능 (주황 배지)
    CLOSED("상담 불가");      // 휴업 등으로 상담 불가

    // 화면에 그대로 보여줄 한글 라벨
    // 색상('green', 'orange')은 화면 표현이므로 서버가 아니라 프론트에서 매핑한다.
    private final String label;

    AgencyStatus(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }
}
