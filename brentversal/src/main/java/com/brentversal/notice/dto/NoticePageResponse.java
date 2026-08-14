package com.brentversal.notice.dto;

import org.springframework.data.domain.Page;

import java.util.List;

public class NoticePageResponse {

    private final List<NoticeResponse> content;
    private final int page;
    private final int pageSize;
    private final int totalPages;
    private final long totalCount;

    private NoticePageResponse(
            List<NoticeResponse> content,
            int page,
            int pageSize,
            int totalPages,
            long totalCount
    ) {
        this.content = content;
        this.page = page;
        this.pageSize = pageSize;
        this.totalPages = totalPages;
        this.totalCount = totalCount;
    }

    public static NoticePageResponse from(Page<NoticeResponse> noticePage) {
        return new NoticePageResponse(
                noticePage.getContent(),
                noticePage.getNumber(),
                noticePage.getSize(),
                noticePage.getTotalPages(),
                noticePage.getTotalElements()
        );
    }

    public List<NoticeResponse> getContent() {
        return content;
    }

    public int getPage() {
        return page;
    }

    public int getPageSize() {
        return pageSize;
    }

    public int getTotalPages() {
        return totalPages;
    }

    public long getTotalCount() {
        return totalCount;
    }
}
