package com.brentversal.common.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

// PasswordEncoder를 SecurityConfig에서 분리한 이유:
// OAuth2LoginSuccessHandler -> MemberService -> PasswordEncoder(SecurityConfig 소속)
//   -> SecurityConfig -> OAuth2LoginSuccessHandler 로 순환 참조가 생겼었다.
// PasswordEncoder처럼 여러 클래스가 두루 쓰는 간단한 빈은 SecurityConfig 안에 두지 않고
// 아무것도 의존하지 않는 별도 설정 클래스로 빼서, SecurityConfig에 새 의존성이 추가돼도
// 다시 순환이 생기지 않게 한다.
@Configuration
public class PasswordEncoderConfig {

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
