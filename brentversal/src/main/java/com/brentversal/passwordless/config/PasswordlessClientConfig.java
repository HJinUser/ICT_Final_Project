package com.brentversal.passwordless.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.MediaType;
import org.springframework.http.codec.json.Jackson2JsonDecoder;
import org.springframework.web.reactive.function.client.ExchangeStrategies;
import org.springframework.web.reactive.function.client.WebClient;

@Configuration
public class PasswordlessClientConfig {

    // 인증서버 호출 전용 WebClient
    @Bean
    public WebClient passwordlessWebClient(PasswordlessProperties props) {
        // 인증서버가 실제로는 JSON을 주면서 Content-Type을 text/plain으로 잘못 표기하는 경우가 있어서,
        // text/plain으로 온 응답도 Jackson JSON 디코더가 처리하도록 허용해준다.
        ExchangeStrategies strategies = ExchangeStrategies.builder()
                .codecs(configurer -> configurer.defaultCodecs()
                        .jackson2JsonDecoder(new Jackson2JsonDecoder(
                                new com.fasterxml.jackson.databind.ObjectMapper(),
                                MediaType.APPLICATION_JSON,
                                MediaType.TEXT_PLAIN)))
                .build();

        return WebClient.builder()
                .baseUrl(props.getAuthServerUrl())
                .exchangeStrategies(strategies)
                .build();
    }
}