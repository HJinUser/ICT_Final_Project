package com.brentversal.config;

import com.brentversal.entity.Member;
import io.jsonwebtoken.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.nio.file.Files;
import java.nio.file.Path;

import java.security.KeyFactory;
import java.security.PrivateKey;
import java.security.PublicKey;
import java.security.spec.PKCS8EncodedKeySpec;
import java.security.spec.X509EncodedKeySpec;
import java.util.Base64;
import java.util.Date;

@Component
public class JwtTokenProvider { // JWT 생성, 검증 기능 담당자 클래스

    private final PrivateKey privateKey;
    private final PublicKey publicKey;

    public JwtTokenProvider(
            // 배포할때 사용할 jwt키를 가져오기
            @Value("${jwt.private-key:}") String privateKeyContent,
            @Value("${jwt.public-key:}") String publicKeyContent,
            @Value("${jwt.private-key-path}") String privateKeyPath,
            @Value("${jwt.public-key-path}") String publicKeyPath
    ) {
        try { // 키가 존재하면 키 사용, 키가 없으면 키의 경로로 키를 가져옴
            this.privateKey = loadPrivateKey(resolveKey(privateKeyContent, privateKeyPath));
            this.publicKey = loadPublicKey(resolveKey(publicKeyContent, publicKeyPath));
        } catch (Exception e) {
            throw new IllegalStateException("JWT 키 파일을 읽는 중 오류가 발생했습니다.", e);
        }
    }

    // 키가 있으면 키를 쓰고 키가 없으면 키의 경로를 가져와서 키를 가져오는 함수
    // 이 클래스의 맴버변수의 값을 어떤걸로 넣을지를 결정함
    // 내용이 있으면 그대로, 없으면 경로에서 파일을 읽어 내용 반환
    private String resolveKey(String content, String path) throws Exception {
        if (content != null && !content.isBlank()) {
            return content;
        }
        // 로컬의 경로에 있는 파일을 가져와서 그 내용을 string으로 만들어서 후 처리 안하게 함
        return Files.readString(Path.of(path));
    }

    private PrivateKey loadPrivateKey(String privateKeyContent) throws Exception {
        String key = privateKeyContent
                .replace("-----BEGIN PRIVATE KEY-----", "")
                .replace("-----END PRIVATE KEY-----", "")
                .replaceAll("\\s", "");

        byte[] decodedKey = Base64.getDecoder().decode(key);
        PKCS8EncodedKeySpec keySpec = new PKCS8EncodedKeySpec(decodedKey);
        KeyFactory keyFactory = KeyFactory.getInstance("RSA");
        return keyFactory.generatePrivate(keySpec);
    }

    private PublicKey loadPublicKey(String publicKeyContent) throws Exception {
        System.out.println("현재 실행 위치 = " + System.getProperty("user.dir"));

        String key = publicKeyContent
                .replace("-----BEGIN PUBLIC KEY-----", "")
                .replace("-----END PUBLIC KEY-----", "")
                .replaceAll("\\s", "");

        byte[] decodedKey = Base64.getDecoder().decode(key);
        X509EncodedKeySpec keySpec = new X509EncodedKeySpec(decodedKey);
        KeyFactory keyFactory = KeyFactory.getInstance("RSA");
        return keyFactory.generatePublic(keySpec);
    }

    @Value("${jwt.expiration}")
    private long expiration; // 만료 1 시간

    // refresh 토큰 파트
    // 만료 시간(ms)
    // application.properties 의 jwt.refresh-expiration 값을 주입받는다.
    @Value("${jwt.refresh-expiration}")
    private long refreshExpiration;

    // MemberController 클래스에서 인증 성공한 사용자를 위하여 로그인 증명서(토큰)를 발급하는 데 사용될 예정입니다.
    public String createToken(Member member){ // 매개 변수 : 토큰 안에 사용자 식별값 저장
        return Jwts.builder()
                .subject(member.getEmail()) // 토큰 주인
                .issuedAt(new Date()) // 토큰 발급 시간
                .expiration(new Date(System.currentTimeMillis() + expiration)) // 토큰 만료 시간
                .claim("role", member.getRole().name()) // 권한 정보
                .signWith(privateKey, Jwts.SIG.RS256)
                .compact(); // 최종 문자열 생성하기
    }

    // refresh token 을 발급하는 메소드 
    // access token 이 만료됐을 때 새 access token 을 재발급받는 용도로만 쓴다.
    public String createRefreshToken(Member member){ // 토큰 주인을 식별할 회원 정보
        return Jwts.builder() // JWT 빌더를 시작
                .subject(member.getEmail()) // 토큰 주인에 이메일을 넣는다 - 나중에 누구의 refresh 인지 식별
                .issuedAt(new Date()) // 토큰 발급 시각을 현재 시간으로 기록한다
                .expiration(new Date(System.currentTimeMillis() + refreshExpiration)) // 만료 시각 = 현재시각 + refresh 만료기간
                .signWith(privateKey, Jwts.SIG.RS256) // access token 과 동일한 비밀키로 서명한다(위조 방지)
                .compact(); // 위 설정들을 하나의 JWT 문자열로 직렬화하여 반환한다
    }

    public String getEmail(String token){ // JWT 토큰에서 사용자 정보 가져 오기
        return this.getClaims(token).getSubject() ;
    }

    public Claims getClaims(String token){
        return Jwts.parser()
                .verifyWith(publicKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public boolean validateToken(String token){ // JWT 토큰 유효성 검사
        try {
            Jwts.parser()
                    .verifyWith(publicKey)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
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
