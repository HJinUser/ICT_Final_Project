export interface Notice {
    id: number;
    title: string;
    content: string;
    viewCount: number;
    createdAt: string;
    updatedAt: string;
}

export interface NoticePayload {
    title: string;
    content: string;
}
