package com.brentversal.config;

import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

public class JwtAuthenticationFilter extends OncePerRequestFilter {
    // 아직 무의미한 null값임 - 값을 주입해야함
    private final JwtTokenProvider jwtTokenProvider ;

    // 값을 주입함
    public JwtAuthenticationFilter(JwtTokenProvider jwtTokenProvider){
        this.jwtTokenProvider = jwtTokenProvider;
    }

    @Override // 모든 요청이 들어올 때 컨트롤러 보다 먼저 (한번만!) 실행이 되는 핵심 로직(메소드)
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {

        // 요청 헤더에서 Authorization 값을 가져온다
        String bearer = request.getHeader("Authorization");

        // 값이 존재하고 "Bearer "로 시작하는지 확인한다
        if(bearer != null && bearer.startsWith("Bearer ")){
            // Bearer "를 제거하여 JWT 토큰만 추출한다
            String token = bearer.substring("Bearer ".length());

            // 토큰의 유효성을 검증한다 (validateToken)
            if(jwtTokenProvider.validateToken(token)){
                // 토큰에서 사용자 이메일을 추출한다 (getEmail)
                String email = jwtTokenProvider.getEmail(token);
                Claims claims = jwtTokenProvider.getClaims(token);

                // 토큰의 claims에서 role 값을 추출한다
                String role = claims.get("role", String.class);

                // 권한 객체 생성 (권한을 담고 있는 객체 모음)
                // 인터페이스라서 객체 생성 불가능 - 구현체를 이용해서 객체를 생성해야 함
                // SimpleGrantedAuthority라는 구현체를 이용함
                List<GrantedAuthority> authorities
                        = List.of(new SimpleGrantedAuthority("ROLE_" + role));

                // 인증 객체 생성
                UsernamePasswordAuthenticationToken auth
                        = new UsernamePasswordAuthenticationToken(email, null,
                        authorities);

                SecurityContextHolder.getContext().setAuthentication(auth);

            }
        }

        filterChain.doFilter(request, response);
    }
}
