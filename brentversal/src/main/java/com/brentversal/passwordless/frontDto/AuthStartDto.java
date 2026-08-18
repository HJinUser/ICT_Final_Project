package com.brentversal.passwordless.frontDto;

import lombok.AllArgsConstructor;
import lombok.Getter;

// 로그인 1단계(인증 시작) 응답. 화면에 보여줄 자동패스워드 숫자 + 폴링에 쓸 sessionId를 담는다.
@Getter
@AllArgsConstructor
public class AuthStartDto {
    private String sessionId;           // 결과 폴링(result API)에 사용
    private String servicePassword;     // 화면에 보여줄 자동패스워드(숫자)
    private int term;                   // 인증 유효 시간(초)
}
