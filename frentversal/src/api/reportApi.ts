import axiosInstance from './axiosInstance';
import type {
    Report,
    ReportCreatePayload,
    ReportProcessPayload,
    ReportStatus,
    ReportTargetType,
} from '../types/Report';

export async function createReport(payload: ReportCreatePayload): Promise<Report> {
    const response = await axiosInstance.post<Report>('/reports', payload);
    return response.data;
}

export async function getMyReports(): Promise<Report[]> {
    const response = await axiosInstance.get<Report[]>('/reports/me');
    return response.data;
}

export async function getReports(params: {
    status: ReportStatus;
    targetType?: ReportTargetType;
}): Promise<Report[]> {
    const response = await axiosInstance.get<Report[]>('/reports', { params });
    return response.data;
}

export async function getReport(id: number): Promise<Report> {
    const response = await axiosInstance.get<Report>(`/reports/${id}`);
    return response.data;
}

export async function processReport(id: number, payload: ReportProcessPayload): Promise<Report> {
    const response = await axiosInstance.patch<Report>(`/reports/${id}/process`, payload);
    return response.data;
}
