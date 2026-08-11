package com.brentversal.common.config;

import com.brentversal.member.service.MemberDetailsService;
import com.brentversal.social.config.OAuth2LoginSuccessHandler;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.ProviderManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
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

    // 로그인 시 email/password를 실제 members 테이블과 대조하기 위해 필요하다.
    private final MemberDetailsService memberDetailsService;

    // 카카오 로그인이 성공했을 때(세션이 아니라 우리 JWT로 넘어가는 지점) 호출할 핸들러
    private final OAuth2LoginSuccessHandler oAuth2LoginSuccessHandler;

    // PasswordEncoderConfig에서 만드는 빈을 그대로 주입받는다(순환 참조 방지 이유는 그 파일 주석 참고).
    private final PasswordEncoder passwordEncoder;

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
                // 카카오 로그인 시작(/oauth2/authorization/kakao)과 콜백(/login/oauth2/code/kakao) 경로.
                // 로그인 전에 접근하는 경로라서 인증 없이 허용해야 한다.
                "/oauth2/**",
                "/login/oauth2/**",
                "/product/**",
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
                        .requestMatchers(permitUrls).permitAll()
                        // 중개사무소 안내·상세는 비회원도 볼 수 있는 화면이라 '조회(GET)'만 인증 없이 허용한다.
                        // 상담 요청·후기 작성(POST)은 아래 anyRequest().authenticated() 에 걸려 로그인이 필요하다.
                        .requestMatchers(HttpMethod.GET, "/agency", "/agency/**").permitAll()
                        .anyRequest().authenticated()
                )
                // 카카오 로그인 성공 후 처리를 OAuth2LoginSuccessHandler가 대신 맡는다.
                // (기본 동작은 세션을 만드는 것인데, 우리는 세션 대신 JWT를 쓰기 때문에 커스텀 핸들러가 필요하다.)
                .oauth2Login(oauth2 -> oauth2.successHandler(oAuth2LoginSuccessHandler))
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

    // AuthenticationConfiguration.getAuthenticationManager()에 맡기면 등록된 UserDetailsService를
    // 자동으로 못 찾는 경우가 있어서(Spring Security 7), DaoAuthenticationProvider를 직접 만들어
    // MemberDetailsService + passwordEncoder를 명시적으로 연결한다.
    @Bean
    public AuthenticationManager authenticationManager() {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider(memberDetailsService);
        provider.setPasswordEncoder(passwordEncoder);
        return new ProviderManager(provider);
    }
}
