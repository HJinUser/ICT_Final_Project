package com.brentversal.passwordless.frontDto;

import lombok.AllArgsConstructor;
import lombok.Getter;

// 로그인 2단계(폴링) 결과. 승인(Y)이면 우리 서비스의 access/refresh token까지 채워서 내려준다.
// 일반 로그인(MemberController.login)과 동일하게 두 토큰을 다 발급한다.
@Getter
@AllArgsConstructor
public class AuthResultDto {
    private String status;          // "W"(대기) "Y"(승인) "N"(거절)
    private String accessToken;     // 승인 시에만 채워짐. 그 외 null
    private String refreshToken;    // 승인 시에만 채워짐. 그 외 null
}
