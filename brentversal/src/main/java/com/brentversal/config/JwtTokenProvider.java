package com.brentversal.config;

import com.brentversal.entity.Member;
import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.security.Key;
import java.util.Date;

@Component
public class JwtTokenProvider { // JWT 생성, 검증 기능 담당자 클래스
    @Value("${jwt.secret}")
    private String secretKey;

    @Value("${jwt.expiration}")
    private long expiration; // 만료 1 시간

    // refresh 토큰 파트
    // 만료 시간(ms)
    // application.properties 의 jwt.refresh-expiration 값을 주입받는다.
    @Value("${jwt.refresh-expiration}")
    private long refreshExpiration;

    private Key signingKey;

    @PostConstruct
    protected void init() {
        this.signingKey = Keys.hmacShaKeyFor(secretKey.getBytes());
    }

    private Key getSigningKey() {
        return signingKey; // 위조 방지를 위한 서명
    }

    // MemberController 클래스에서 인증 성공한 사용자를 위하여 로그인 증명서(토큰)를 발급하는 데 사용될 예정입니다.
    public String createToken(Member member){ // 매개 변수 : 토큰 안에 사용자 식별값 저장
        return Jwts.builder()
                .setSubject(member.getEmail()) // 토큰 주인
                .setIssuedAt(new Date()) // 토큰 발급 시간
                .setExpiration(new Date(System.currentTimeMillis() + expiration)) // 토큰 만료 시간


                .signWith(getSigningKey(), SignatureAlgorithm.HS256)
                .claim("role", member.getRole().name()) // 권한 정보
                .compact(); // 최종 문자열 생성하기
    }

    // refresh token 을 발급하는 메소드 
    // access token 이 만료됐을 때 새 access token 을 재발급받는 용도로만 쓴다.
    public String createRefreshToken(Member member){ // 토큰 주인을 식별할 회원 정보
        return Jwts.builder() // JWT 빌더를 시작
                .setSubject(member.getEmail()) // 토큰 주인에 이메일을 넣는다 - 나중에 누구의 refresh 인지 식별
                .setIssuedAt(new Date()) // 토큰 발급 시각을 현재 시간으로 기록한다
                .setExpiration(new Date(System.currentTimeMillis() + refreshExpiration)) // 만료 시각 = 현재시각 + refresh 만료기간
                .signWith(getSigningKey(), SignatureAlgorithm.HS256) // access token 과 동일한 비밀키로 서명한다(위조 방지)
                .compact(); // 위 설정들을 하나의 JWT 문자열로 직렬화하여 반환한다
    }

    public String getEmail(String token){ // JWT 토큰에서 사용자 정보 가져 오기
        return this.getClaims(token).getSubject() ;
    }

    public Claims getClaims(String token){
        return Jwts.parserBuilder()
                .setSigningKey(getSigningKey())
                .build()
                .parseClaimsJws(token)
                .getBody();
    }

    public boolean validateToken(String token){ // JWT 토큰 유효성 검사
        try {
            Jwts.parserBuilder()
                    .setSigningKey(getSigningKey())
                    .build()
                    .parseClaimsJws(token);
            return true;

        } catch (ExpiredJwtException e) {
            System.out.println("토큰 만료됨");

        } catch (io.jsonwebtoken.security.SecurityException | MalformedJwtException e) {
            System.out.println("토큰 서명/형식 오류");

        } catch (Exception e) {
            System.out.println("기타 토큰 오류");
        }
        return false ;
    }

}
