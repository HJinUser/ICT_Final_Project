package com.brentversal.passwordless.dto;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter @Setter @NoArgsConstructor
public class PasswordlessResponse {
    private boolean result;     // 성공 여부
    private String msg;         // 메시지
    private String code;        // 에러/상태 코드 (000.0 = OK)
    private JsonNode data;      // 응답마다 모양이 달라 유연하게 JsonNode로 받음
}
