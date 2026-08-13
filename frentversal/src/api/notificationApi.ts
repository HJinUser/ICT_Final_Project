// 헤더 종 아이콘이 부르는 알림 API (/notifications)
//
// 역할(일반 사용자·중개인·관리자)에 따라 담기는 항목이 서버에서 정해지므로
// 프론트는 역할을 따지지 않고 이 함수 하나만 부르면 된다.
//   공통   : 최근 공지사항 "[공지] 제목"
//   중개인 : 미답변 상담 요청, 미답변 리뷰
//   관리자 : 승인 대기 매물, 심사 대기 인증 신청

import customAxios from './axiosInstance';
import type { NotificationResponse } from '../types/Notification';

export async function getNotifications(): Promise<NotificationResponse> {
    try {
        const response = await customAxios.get<NotificationResponse>('/notifications');
        return response.data;
    } catch {
        // 알림 때문에 헤더가 깨지면 안 되므로, 실패하면 빈 목록으로 처리한다
        return { content: [], unreadCount: 0 };
    }
}
