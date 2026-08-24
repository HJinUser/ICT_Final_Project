package com.brentversal.chat.dto;

// 이 클래스에서 사용할 Java/Spring/프로젝트 타입 불러옴
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

/*
  챗봇 대화 한 줄.

  대화를 DB에 저장하지 않기로 했으므로 서버는 이전 대화를 기억하지 못한다.
  그래서 화면이 들고 있던 기록을 매 요청마다 통째로 보내고, 서버는 그것을 그대로 파이썬에 넘긴다.
 */
@Getter @Setter
public class ChatMessageDto {

    // "user"(사용자가 쓴 말) 또는 "assistant"(챗봇이 한 말)
    @NotBlank(message = "대화 역할이 없습니다.")
    private String role;

    @NotBlank(message = "대화 내용이 비어 있습니다.")
    private String content;
}
