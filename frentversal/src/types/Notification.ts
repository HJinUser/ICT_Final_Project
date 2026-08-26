// 헤더 종 아이콘의 알림 타입
// 백엔드의 notification 도메인(NotificationDto, NotificationType)과 1:1로 맞춰 두었다.
//
// 역할마다 받는 알림의 '내용'은 다르지만 '모양'은 모두 같아서 타입도 하나만 쓴다.
//   중개인 : CONSULTATION(상담 요청) · REVIEW(리뷰) · MODIFY_REQUEST(관리자 매물 수정 요청)
//   관리자 : PROPERTY_APPROVAL(매물 승인) · BROKER_VERIFICATION(중개인 인증)
//   공통   : NOTICE(공지) · CONSULTATION_REPLY(내가 보낸 상담에 답변 도착)

export type NotificationType =
    | 'CONSULTATION'
    | 'CONSULTATION_REPLY'
    | 'REVIEW'
    | 'MODIFY_REQUEST'
    | 'PROPERTY_APPROVAL'
    | 'BROKER_VERIFICATION'
    | 'NOTICE';

export interface Notification {
    type: NotificationType;
    typeLabel: string; // 상담 요청 / 리뷰 / 매물 승인 ... (화면에 그대로 쓸 한글)
    targetId: number;
    title: string;
    message: string;
    linkPath: string;  // 눌렀을 때 이동할 주소
    createdAt: string;
}

export interface NotificationResponse {
    content: Notification[];
    unreadCount: number; // 종 아이콘 옆 빨간 배지 숫자
}
