package com.brentversal.social.config;

import com.brentversal.common.config.JwtTokenProvider;
import com.brentversal.member.constant.SocialType;
import com.brentversal.member.entity.Member;
import com.brentversal.member.repository.MemberRepository;
import com.brentversal.member.service.MemberService;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Map;

// 소셜 로그인이 성공(신원 확인 완료)하면 스프링 시큐리티가 이 클래스를 호출한다.
// 여기서부터는 스프링이 기본으로 만드는 세션을 쓰지 않고, 우리 JWT 체계로 넘어간다.
// 이 시점은 axios 요청이 아니라 브라우저가 소셜로그인→우리 서버로 이동해 온 상태라서
// JSON을 응답할 수 없고, 프론트의 특정 페이지로 리다이렉트하면서 필요한 값을 URL에 실어 보낸다.
//
// common/config가 아니라 social/config에 두는 이유: 로그인/회원가입 자체는 member 도메인
// 코드(MemberService 등)에 그대로 남아 있지만, "소셜 제공자 응답을 어떻게 해석할지"는
// 카카오/구글/네이버가 붙을수록 이 클래스 안에서만 계속 늘어날 내용이라 별도 도메인으로 뺐다.
@Component
@RequiredArgsConstructor
public class OAuth2LoginSuccessHandler implements AuthenticationSuccessHandler {

    private final MemberRepository memberRepository;
    private final MemberService memberService;
    private final JwtTokenProvider jwtTokenProvider;

    // 로컬은 vite 기본 포트, 배포는 CD가 실제 도메인(https://rentversal.site)으로 주입한다.
    // (application.properties의 app.frontend-base-url)
    @Value("${app.frontend-base-url}")
    private String frontendBaseUrl;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
                                         Authentication authentication) throws IOException, ServletException {

        // OAuth2AuthenticationToken은 OAuth2User뿐 아니라, application.properties에 등록한
        // registration 이름("kakao", "google")도 함께 들고 있다. 이 이름으로 "지금 로그인한 게
        // 어느 제공자인지"를 구분한다.
        OAuth2AuthenticationToken oAuth2Token = (OAuth2AuthenticationToken) authentication;
        String registrationId = oAuth2Token.getAuthorizedClientRegistrationId(); // "kakao" 또는 "google"
        OAuth2User oAuth2User = oAuth2Token.getPrincipal();
        Map<String, Object> attributes = oAuth2User.getAttributes();

        // 제공자마다 사용자 정보 응답 모양이 완전히 다르므로, registrationId로 분기해서
        // 우리가 쓸 4가지 값(제공자 종류/고유ID/이름/이메일)으로 통일한다.
        SocialUserInfo userInfo = extractUserInfo(registrationId, attributes);

        Member member = memberRepository.findBySocialTypeAndSocialUserId(
                userInfo.getSocialType(), userInfo.getSocialUserId());

        String redirectUrl;
        if (member != null) {
            // 이미 연결된 계정 → 우리 JWT를 발급해서 바로 로그인 완료 처리한다.
            String accessToken = jwtTokenProvider.createToken(member);
            String refreshToken = jwtTokenProvider.createRefreshToken(member);
            memberService.updateRefreshToken(member.getEmail(), refreshToken);

            redirectUrl = UriComponentsBuilder.fromUriString(frontendBaseUrl + "/oauth/callback")
                    .queryParam("accessToken", accessToken)
                    .queryParam("refreshToken", refreshToken)
                    .queryParam("id", member.getId())
                    .queryParam("name", member.getName())
                    .queryParam("email", member.getEmail())
                    .queryParam("role", member.getRole().name())
                    // 소셜 로그인도 일반 로그인과 동일하게, 프론트가 이 값으로 취향 초기 설정 리다이렉트 여부를 정한다.
                    .queryParam("preferenceCompleted", member.isPreferenceCompleted())
                    .build()
                    .encode(StandardCharsets.UTF_8)
                    .toUriString();
        } else {
            // 처음 연결하는 계정 → 아직 회원을 만들지 않고, 추가정보 입력 페이지로 보낸다.
            // 그 페이지가 이 토큰을 다시 제출해야(SignupDto.socialToken) 진짜 가입이 완료된다.
            String socialToken = jwtTokenProvider.createSocialSignupToken(
                    userInfo.getSocialType().name(), userInfo.getSocialUserId(), userInfo.getEmail());

            redirectUrl = UriComponentsBuilder.fromUriString(frontendBaseUrl + "/oauth/signup")
                    .queryParam("token", socialToken)
                    .queryParam("nickname", userInfo.getNickname())
                    .queryParam("email", userInfo.getEmail() != null ? userInfo.getEmail() : "")
                    .build()
                    .encode(StandardCharsets.UTF_8)
                    .toUriString();
        }

        response.sendRedirect(redirectUrl);
    }

    // registrationId를 보고 어느 제공자의 응답 구조로 읽을지 정한다.
    private SocialUserInfo extractUserInfo(String registrationId, Map<String, Object> attributes) {
        if ("kakao".equals(registrationId)) {
            return extractKakao(attributes);
        } else if ("google".equals(registrationId)) {
            return extractGoogle(attributes);
        } else if ("naver".equals(registrationId)) {
            return extractNaver(attributes);
        }
        throw new IllegalArgumentException("지원하지 않는 소셜 로그인 제공자입니다: " + registrationId);
    }

    // 카카오 응답 구조: { "id": 123, "kakao_account": { "email": "...", "profile": { "nickname": "..." } } }
    private SocialUserInfo extractKakao(Map<String, Object> attributes) {
        String socialUserId = String.valueOf(attributes.get("id"));

        @SuppressWarnings("unchecked")
        Map<String, Object> kakaoAccount = (Map<String, Object>) attributes.get("kakao_account");
        @SuppressWarnings("unchecked")
        Map<String, Object> profile = kakaoAccount != null ? (Map<String, Object>) kakaoAccount.get("profile") : null;
        String nickname = profile != null ? String.valueOf(profile.get("nickname")) : "";
        String email = kakaoAccount != null ? (String) kakaoAccount.get("email") : null;

        return new SocialUserInfo(SocialType.KAKAO, socialUserId, nickname, email);
    }

    // 구글 응답 구조(OIDC 표준 claim): { "sub": "고유ID", "name": "...", "email": "..." }
    // 카카오처럼 중첩된 구조가 아니라 최상위에 바로 값이 있다.
    private SocialUserInfo extractGoogle(Map<String, Object> attributes) {
        String socialUserId = String.valueOf(attributes.get("sub"));
        String name = (String) attributes.get("name");
        String email = (String) attributes.get("email");

        return new SocialUserInfo(SocialType.GOOGLE, socialUserId, name, email);
    }

    // 네이버 응답 구조: { "response": { "id": "...", "email": "...", "name": "..." } }
    // 네이버는 실제 값이 전부 "response"라는 키 한 겹 안에 감싸져 있다.
    // application-local.properties의 user-name-attribute=response가 스프링에게
    // "response를 대표 속성으로 봐라"라고 알려준 것과 짝을 이루는 부분이다.
    private SocialUserInfo extractNaver(Map<String, Object> attributes) {
        @SuppressWarnings("unchecked")
        Map<String, Object> naverAccount = (Map<String, Object>) attributes.get("response");

        String socialUserId = String.valueOf(naverAccount.get("id"));
        String name = (String) naverAccount.get("name");
        String email = (String) naverAccount.get("email");

        return new SocialUserInfo(SocialType.NAVER, socialUserId, name, email);
    }

    // 제공자마다 다른 응답 모양을, 이 클래스 안에서 쓸 공통 모양 4개 값으로 통일해 담는 그릇.
    // Member 엔티티나 DB 컬럼이 아니라, 이 파일 안에서만 잠깐 쓰는 값이라 private static 클래스로 둔다.
    @Getter
    @RequiredArgsConstructor
    private static class SocialUserInfo {
        private final SocialType socialType;
        private final String socialUserId;
        private final String nickname;
        private final String email;
    }
}
