package com.brentversal.chat.controller;

// 이 클래스에서 사용할 Java/Spring/프로젝트 타입 불러옴
import com.brentversal.chat.dto.ChatRequestDto;
import com.brentversal.chat.service.ChatService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/*
  AI 챗봇 Controller임.

  React는 FastAPI에 직접 갈 수 없다. nginx가 /api 를 이 서버로만 넘기고
  ML 서버는 외부에 열려 있지 않기 때문이다. 그래서 이 Controller가 중계 역할을 한다.

  이 경로는 SecurityConfig 의 anyRequest().authenticated() 에 걸려 로그인해야 쓸 수 있다.
  별도 규칙을 추가하지 않은 것은 "로그인한 사람만" 이라는 기준이 그것과 같기 때문이다.
 */
@RestController
@RequestMapping("/chat")
@RequiredArgsConstructor
public class ChatController {

    private final ChatService chatService;

    // 대화와 화면 정보를 받아 FastAPI 챗봇 답변을 반환하는 POST API 메서드임
    @PostMapping
    public ResponseEntity<?> chat(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
            @Valid @RequestBody ChatRequestDto dto) {

        // FastAPI가 꺼져 있거나 OpenAI 키가 없으면 ChatService가 IllegalStateException을 던진다.
        // 이것은 요청이 잘못된 것이 아니라 서버 사정이므로 503으로 구분해서 알린다.
        try {
            Map<String, Object> result = chatService.ask(dto, authorization);

            // 정상 처리 결과를 HTTP 200 응답으로 반환함
            return ResponseEntity.ok(result);

        } catch (IllegalStateException e) {
            // 서버 사정으로 지금 답할 수 없다는 것을 화면이 구분할 수 있게 503으로 돌려줌
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(Map.of("message", e.getMessage()));
        }
    }
}
