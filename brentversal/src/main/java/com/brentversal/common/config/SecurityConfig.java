package com.brentversal.common.config;

import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfigurationSource;

@Configuration
@RequiredArgsConstructor
public class SecurityConfig {

    // JwtTokenProvider.java에서 @Component로 생성함
    private final JwtTokenProvider jwtTokenProvider;

    // CorsConfig.java에 CorsConfigurationSource의 @Bean으로 객체 생성이 되어 있음
    private final CorsConfigurationSource corsConfigurationSource;

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {

        String[] permitUrls = {
                "/images/**",
                "/fruit/**",
                "/css/**",
                "/js/**",
                "/member/signup",
                "/member/login",
                "/member/refresh", // [refresh] access token 재발급 요청. 만료된 상태에서 호출되므로 인증 없이 허용해야 한다.
                "/product/**",
                // 중개사무소 안내는 비회원도 볼 수 있는 화면이라 조회 API 를 인증 없이 허용한다.
                // 나중에 등록·수정(POST/PUT)을 추가하면 그 경로는 여기서 빼고 인증을 받아야 한다.
                "/agency",
                "/agency/**",
                // 404, 500 등이 발생하면 서블릿 컨테이너가 /error 로 다시 보내는데(ERROR 디스패치),
                // 이 경로도 시큐리티를 한 번 더 통과한다. 허용해 두지 않으면 모든 오류가
                // 원래 상태 코드 대신 403 빈 응답으로 바뀌어 프론트에서 원인을 알 수 없게 된다.
                "/error",
                // S3용 파일경로
                "/files/**"
        };

        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource))
                .csrf(csrf -> csrf.disable())
                .sessionManagement(session ->
                        session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
                )
                .authorizeHttpRequests(auth -> auth
                        // 공지 목록과 상세는 비회원도 조회할 수 있다.
                        .requestMatchers(HttpMethod.GET, "/notices", "/notices/**").permitAll()
                        // 공지 등록·수정·삭제는 관리자만 가능하다.
                        .requestMatchers("/notices", "/notices/**").hasRole("ADMIN")
                        // 일반 사용자와 중개인은 신고를 접수하고 자신의 신고 내역을 조회한다.
                        .requestMatchers(HttpMethod.POST, "/reports").hasAnyRole("USER", "BROKER")
                        .requestMatchers(HttpMethod.GET, "/reports/me").hasAnyRole("USER", "BROKER")
                        // 신고 목록·상세 조회와 처리 권한은 관리자에게만 있다.
                        .requestMatchers("/reports", "/reports/**").hasRole("ADMIN")
                        .requestMatchers(permitUrls).permitAll()
                        .anyRequest().authenticated()
                )
                // 인증이 안 된 요청에 대한 응답을 401 로 맞춘다.
                // 이 설정이 없으면 로그인 방식(formLogin/httpBasic)을 쓰지 않는 구성이라
                // 시큐리티 기본값인 Http403ForbiddenEntryPoint 가 적용되어 403 이 나간다.
                // 프론트(axiosInstance)는 401 일 때만 refresh 재발급을 시도하므로 401 이어야 한다.
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint((request, response, authException) -> {
                            // sendError() 를 쓰면 /error 로 다시 넘어가므로 상태와 본문을 직접 쓴다
                            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                            response.setContentType("application/json;charset=UTF-8");
                            response.getWriter().write("{\"error\":\"인증이 필요합니다.\"}");
                        })
                );

        // JWT 필터 등록 (JwtAuthenticationFilter에 생성되어있음)
        http.addFilterBefore(
                new JwtAuthenticationFilter(jwtTokenProvider),
                UsernamePasswordAuthenticationFilter.class
        );

        return http.build();
    }

    @Bean
    public AuthenticationManager authenticationManager(
            AuthenticationConfiguration config
    ) throws Exception {
        return config.getAuthenticationManager();
    }
}
