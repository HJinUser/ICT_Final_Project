package com.brentversal.notice.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class NoticeCreateRequest {

    @NotBlank(message = "공지사항 제목은 필수 입력 사항입니다.")
    @Size(max = 200, message = "공지사항 제목은 200자 이하로 입력해 주세요.")
    private String title;

    @NotBlank(message = "공지사항 내용은 필수 입력 사항입니다.")
    private String content;

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }
}
