import axiosInstance from './axiosInstance';
import type { Notice, NoticePayload } from '../types/Notice';

// 공지사항 전체 목록 조회
export async function getNotices(): Promise<Notice[]> {
    const response = await axiosInstance.get<Notice[]>('/notices');
    return response.data;
}

// 공지사항 상세 조회
export async function getNotice(id: number): Promise<Notice> {
    const response = await axiosInstance.get<Notice>(`/notices/${id}`);
    return response.data;
}

// 공지사항 등록
export async function createNotice(payload: NoticePayload): Promise<Notice> {
    const response = await axiosInstance.post<Notice>('/notices', payload);
    return response.data;
}

// 공지사항 수정
export async function updateNotice(id: number, payload: NoticePayload): Promise<Notice> {
    const response = await axiosInstance.put<Notice>(`/notices/${id}`, payload);
    return response.data;
}

// 공지사항 삭제
export async function deleteNotice(id: number): Promise<void> {
    await axiosInstance.delete(`/notices/${id}`);
}
