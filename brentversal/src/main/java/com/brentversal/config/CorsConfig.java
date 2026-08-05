package com.brentversal.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration // 설정 파일임을 의미
public class CorsConfig {
    // 객체임을 의미
    @Bean // Spring Security가 이 Bean을 읽어서 CORS 정책으로 사용합니다.
    public CorsConfigurationSource corsConfigurationSource(){
        // configuration 객체는 클라이언트로부터 요청이 들어 왔을 때 CORS 정책을 적용시켜주는 객체
        CorsConfiguration configuration = new CorsConfiguration();

        // 리액트의 포트 번호를 여기에 작성
        // 도메인 주소로 수정
        configuration.setAllowedOrigins(List.of(
                "http://localhost:5173",
                "http://127.0.0.1:5173"
                // 나중에 도메인 주소 추가해야함
                // ex) "https://{MASKED}" / "https://*.{MASKED}"
        ));

        // 허용 HTTP 메소드
        configuration.setAllowedMethods(List.of(
                "GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"
        ));

        // Authorization은 axiosInstance.tsx 파일 참조
        // Content-Type은 LoginPage.tsx 파일 참조
        configuration.setAllowedHeaders(List.of(
                "Authorization",
                "Content-Type", // MIME 타입
                "Accept"
        ));

        // 쿠키 Authorization 헤더 포함 요청 허용
        configuration.setAllowCredentials(true);

        // CorsConfigurationSource가 인터페이스여서 객체 생성 못함
        // 그래서 구현체를 만들어서 객체 생성함
        UrlBasedCorsConfigurationSource source
                = new UrlBasedCorsConfigurationSource();

        // 설정 객체인 configuration을 구현체로 생성한 객체인 source에 할당함
        // 모든 요청에 똑같이 위의 설정값들을 적용함 (**의 의미)
        source.registerCorsConfiguration("/**", configuration);

        /* 어떤 요청에는 어떤 설정값을 적용할지 상세히 나눌 수도 있음
        source.registerCorsConfiguration("/member/**", memberConfig);
        source.registerCorsConfiguration("/product/**", productConfig);
        source.registerCorsConfiguration("/cart/**", cartConfig);
        */

        // 구현체를 리턴함
        return source ;
    }
}
