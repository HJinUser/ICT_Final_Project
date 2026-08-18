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

export interface NoticePageResponse {
    content: Notice[];
    page: number;
    pageSize: number;
    totalPages: number;
    totalCount: number;
}
