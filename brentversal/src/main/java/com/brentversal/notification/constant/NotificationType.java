package com.brentversal.notification.constant;

// 알림의 종류
//
// 역할마다 받는 알림이 다르지만 화면에 그려지는 모양은 모두 같다(제목·미리보기·이동 주소·시각).
// 그래서 알림을 종류별로 나누지 않고, 이 열거형으로 구분만 한다.
// 프론트는 이 값을 보고 아이콘이나 색을 다르게 줄 수 있다.
public enum NotificationType {
    // 상담을 보낸 사람이 받는 알림 (역할과 상관없다)
    CONSULTATION_REPLY("상담 답변"),

    // 중개인이 받는 알림
    CONSULTATION("상담 요청"),
    REVIEW("리뷰"),

    // 관리자가 받는 알림
    PROPERTY_APPROVAL("매물 승인"),
    BROKER_VERIFICATION("중개인 인증"),

    // 모든 로그인 사용자가 받는 알림
    // (공지사항 도메인은 다른 팀원이 만드는 중이라 아직 이 값을 쓰는 곳이 없다)
    NOTICE("공지");

    private final String label;

    NotificationType(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }
}
