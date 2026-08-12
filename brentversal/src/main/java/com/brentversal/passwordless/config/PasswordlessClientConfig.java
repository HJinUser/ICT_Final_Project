package com.brentversal.passwordless.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.WebClient;

@Configuration
public class PasswordlessClientConfig {

    // 인증서버 호출 전용 WebClient
    @Bean
    public WebClient passwordlessWebClient(PasswordlessProperties props) {
        return WebClient.builder()
                .baseUrl(props.getAuthServerUrl())
                .build();
    }
}
