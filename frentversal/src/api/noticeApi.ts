import axiosInstance from './axiosInstance';
import type { Notice, NoticePayload } from '../types/Notice';

export async function getNotices(): Promise<Notice[]> {
    const response = await axiosInstance.get<Notice[]>('/notices');
    return response.data;
}

export async function getNotice(id: number): Promise<Notice> {
    const response = await axiosInstance.get<Notice>(`/notices/${id}`);
    return response.data;
}

export async function createNotice(payload: NoticePayload): Promise<Notice> {
    const response = await axiosInstance.post<Notice>('/notices', payload);
    return response.data;
}

export async function updateNotice(id: number, payload: NoticePayload): Promise<Notice> {
    const response = await axiosInstance.put<Notice>(`/notices/${id}`, payload);
    return response.data;
}

export async function deleteNotice(id: number): Promise<void> {
    await axiosInstance.delete(`/notices/${id}`);
}
