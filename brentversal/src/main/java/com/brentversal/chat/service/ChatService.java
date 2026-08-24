package com.brentversal.chat.service;

// 이 클래스에서 사용할 Java/Spring/프로젝트 타입 불러옴
import com.brentversal.chat.dto.ChatMessageDto;
import com.brentversal.chat.dto.ChatPageContextDto;
import com.brentversal.chat.dto.ChatRequestDto;
import com.brentversal.common.ml.MlClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/*
  AI 챗봇 요청을 FastAPI에 넘기고 답변을 받아오는 Service임.

  이 클래스는 DB를 건드리지 않는다. 대화를 저장하지 않기로 했고, 매물 조회는
  FastAPI가 도구를 실행하면서 매물 API를 되불러 처리하기 때문이다.
  그래서 Repository도 @Transactional도 없다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ChatService {

    private final MlClient mlClient;

    // 화면이 보낸 대화와 사용자 토큰을 FastAPI 챗봇 API에 넘겨 답변을 받아오는 메서드임
    public Map<String, Object> ask(ChatRequestDto dto, String authorization) {
        Map<String, Object> request = new LinkedHashMap<>();

        request.put("messages", toMessages(dto.getMessages()));
        request.put("pageContext", toPageContext(dto.getPageContext()));

        /*
          사용자 토큰을 그대로 실어 보낸다.

          FastAPI는 매물 API를 되부를 때 이 토큰을 Authorization 헤더에 붙인다.
          챗봇 전용 토큰을 새로 만들면 사용자가 볼 수 없는 자료까지 챗봇이 볼 수 있게 되므로,
          받은 토큰을 그대로 넘겨 권한을 사용자와 똑같이 맞춘다.
         */
        request.put("accessToken", authorization);

        // FastAPI가 꺼져 있거나 응답이 늦으면 RestClientException이 올라온다.
        // 화면에 원인 모를 500을 그대로 보내지 않고, 상태를 구분할 수 있는 예외로 바꿔 던진다.
        try {
            return mlClient.chat(request);
        } catch (RestClientException e) {
            log.warn("챗봇 서버 호출에 실패했습니다.", e);
            throw new IllegalStateException("AI 챗봇 서버에 연결하지 못했습니다.", e);
        }
    }

    // 대화 DTO 목록을 FastAPI가 읽을 Map 목록으로 바꾸는 메서드임
    private List<Map<String, Object>> toMessages(List<ChatMessageDto> messages) {
        List<Map<String, Object>> result = new ArrayList<>();

        // 대상 데이터를 하나씩 순회하면서 각 항목에 동일한 처리 규칙을 적용함
        for (ChatMessageDto message : messages) {
            Map<String, Object> one = new LinkedHashMap<>();
            one.put("role", message.getRole());
            one.put("content", message.getContent());
            result.add(one);
        }

        // 계산이 끝난 결과를 호출한 쪽에서 이어서 사용할 수 있도록 반환함
        return result;
    }

    // 화면 정보 DTO를 FastAPI가 읽을 Map으로 바꾸는 메서드임
    private Map<String, Object> toPageContext(ChatPageContextDto pageContext) {
        // 화면 정보를 안 보낸 요청도 있으므로 먼저 확인한다
        if (pageContext == null) {
            return null;
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("path", pageContext.getPath());
        result.put("propertyId", pageContext.getPropertyId());

        // 계산이 끝난 결과를 호출한 쪽에서 이어서 사용할 수 있도록 반환함
        return result;
    }
}
