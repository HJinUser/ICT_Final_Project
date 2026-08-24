package com.brentversal.chat.dto;

// 이 클래스에서 사용할 Java/Spring/프로젝트 타입 불러옴
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

// 화면이 챗봇에 보내는 요청 전체를 담는 DTO임
@Getter @Setter
public class ChatRequestDto {

    @NotEmpty(message = "대화 내용이 비어 있습니다.")
    @Valid
    private List<ChatMessageDto> messages;

    @Valid
    private ChatPageContextDto pageContext;
}
