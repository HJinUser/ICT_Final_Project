package com.brentversal.passwordless.service;

import com.brentversal.common.config.JwtTokenProvider;
import com.brentversal.common.mail.MailService;
import com.brentversal.member.constant.Role;
import com.brentversal.member.constant.SocialType;
import com.brentversal.member.entity.Member;
import com.brentversal.member.repository.MemberRepository;
import com.brentversal.member.service.MemberService;
import com.brentversal.passwordless.backDto.PasswordlessResponse;
import com.brentversal.passwordless.client.PasswordlessClient;
import com.brentversal.passwordless.frontDto.AuthResultDto;
import com.brentversal.passwordless.frontDto.AuthStartDto;
import com.brentversal.passwordless.frontDto.RegisterInfoDto;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PasswordlessService {

    private final PasswordlessClient client;
    private final MemberRepository memberRepository;
    private final MemberService memberService;  // updateRefreshToken 재사용
    private final JwtTokenProvider jwtTokenProvider;
    private final MailService mailService;
    // 등록/해지는 아직 로그인하지 않은 상태에서 호출되므로, 여기서 이메일+비번으로 본인 확인을 한다.
    // MemberController.login()과 동일한 방식(AuthenticationManager)을 그대로 재사용한다.
    private final AuthenticationManager authenticationManager;

    private Member verifyMember(String email, String password){
        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(email, password)
            );
        } catch (AuthenticationException e){
            throw new IllegalArgumentException("이메일 또는 비밀번호가 올바르지 않습니다.");
        }
        return memberRepository.findByEmail(email);
    }

    private Member verifyForRegister(String email, String password, String signupToken){
        Member member = memberRepository.findByEmail(email);
        if (member == null){
            throw new IllegalArgumentException("존재하지 않는 이메일입니다.");
        }

        if (member.getPassword() != null){
            // 비밀번호가 있는 계정 → 기존 로그인과 동일하게 비밀번호로 확인
            return verifyMember(email, password);
        }

        // 비밀번호가 없는 계정(중개인) → 가입 직후 발급된 단기 토큰으로 확인
        if (signupToken == null || signupToken.isBlank()
                || !jwtTokenProvider.validateToken(signupToken)
                || !jwtTokenProvider.isTokenType(signupToken, JwtTokenProvider.TYPE_BROKER_SIGNUP)
                || !email.equals(jwtTokenProvider.getEmail(signupToken))){
            throw new IllegalArgumentException("본인 확인에 실패했습니다.");
        }
        return member;
    }

    // ===== 등록: QR 정보 발급 =====
    @Transactional(readOnly = true)
    public RegisterInfoDto requestRegister(String email, String password, String signupToken){
        Member member = verifyForRegister(email, password, signupToken);

        // 소셜 로그인으로 이미 연결된 계정은 패스워드리스를 중복으로 쓸 필요가 없으므로 막는다.
        if (member.getSocialType() != SocialType.NONE) {
            throw new IllegalStateException("소셜 로그인 계정은 패스워드리스를 등록할 수 없습니다.");
        }

        if (client.isRegistered(email)) {
            throw new IllegalStateException("이미 패스워드리스에 등록된 계정입니다.");
        }

        PasswordlessResponse res = client.joinAp(email, member.getName(), member.getEmail());
        if (res == null || !res.isResult() || res.getData() == null) {
            throw new IllegalStateException("등록 정보 요청 실패");
        }
        JsonNode d = res.getData();
        return new RegisterInfoDto(
                d.path("qr").asText(),
                d.path("serverUrl").asText(),
                d.path("registerKey").asText()
        );
    }

    // ===== 등록 완료 확인: 모바일 QR 등록 후 isAp로 확인 + DB 플래그 ON =====
    @Transactional
    public boolean confirmRegister(String email){
        boolean registered = client.isRegistered(email);
        if (registered){
            Member member = memberRepository.findByEmail(email);
            member.setPasswordlessRegistered(true);
        }
        return registered;
    }

    // ===== 로그인 1단계: 인증 시작(자동패스워드 생성) =====
    @Transactional(readOnly = true)
    public AuthStartDto startLogin(String email, String clientIp){
        if (!client.isRegistered(email)){
            throw new IllegalStateException("패스워드리스 미등록 계정입니다.");
        }

        String token = client.getDecryptedToken(email);
        String random = UUID.randomUUID().toString().replace("-", "");
        String sessionId = System.currentTimeMillis() + "-" + random.substring(0, 8);

        PasswordlessResponse res = client.getSp(token, email, random, sessionId, clientIp);
        if (res == null || !res.isResult() || res.getData() == null){
            throw new IllegalStateException("인증 시작 실패: " + (res != null ? res.getMsg() : "no response"));
        }
        JsonNode d = res.getData();
        return new AuthStartDto(
                sessionId,
                d.path("servicePassword").asText(),
                d.path("term").asInt(60)
        );
    }
    // ===== 로그인 2단계: 모바일 승인 결과 폴링 + JWT 발급 =====
    // 프론트가 2초마다 반복 호출한다. 승인(Y)이면 일반 로그인과 동일하게 access/refresh 토큰을 발급하고
    // refresh token은 memberService.updateRefreshToken으로 저장한다(재발급 때 대조하기 위함).
    @Transactional
    public AuthResultDto checkLogin(String email, String sessionId){
        PasswordlessResponse res = client.result(email, sessionId);
        if (res == null || res.getData() == null) {
            return new AuthResultDto("W", null, null); // 아직 대기로 간주
        }

        String auth = res.getData().path("auth").asText("W");

        if ("Y".equals(auth)) {
            Member member = memberRepository.findByEmail(email);
            String accessToken = jwtTokenProvider.createToken(member);
            String refreshToken = jwtTokenProvider.createRefreshToken(member);
            memberService.updateRefreshToken(member.getEmail(), refreshToken);
            return new AuthResultDto("Y", accessToken, refreshToken);
        }

        return new AuthResultDto(auth, null, null); // N(거절) 또는 W(대기)
    }

    // ===== 로그인 취소 =====
    public void cancelLogin(String email, String sessionId){
        client.cancel(email, sessionId);
    }

    // ===== 해지 =====
    @Transactional
    public void withdrawal(String email, String password){
        verifyMember(email, password);

        boolean ok = client.withdrawal(email);
        if (!ok) {
            throw new IllegalStateException("패스워드리스 해지에 실패했습니다. 잠시 후 다시 시도해 주세요.");
        }

        Member member = memberRepository.findByEmail(email);
        if (member != null) {
            member.setPasswordlessRegistered(false);
        }
    }

    // 단순 등록 여부 조회용
    @Transactional(readOnly = true)
    public boolean isRegistered(String email){
        return client.isRegistered(email);
    }

    @Transactional(readOnly = true)
    public void resendSignupToken(String email) {
        Member member = memberRepository.findByEmail(email);
        if (member == null || member.getRole() != Role.BROKER || member.getPassword() != null) {
            throw new IllegalArgumentException("등록 대상이 아닌 계정입니다.");
        }
        if (member.isPasswordlessRegistered()) {
            throw new IllegalStateException("이미 패스워드리스 등록이 완료된 계정입니다.");
        }

        String resendToken = jwtTokenProvider.createBrokerResendToken(member);
        String body = "아래 링크로 접속해 \"QR 코드 발급\" 버튼을 누르면 패스워드리스 등록을 이어서 진행할 수 있습니다.\n"
                + "https://rentversal.site/member/passwordless?email=" + email + "&linkToken=" + resendToken
                + "\n\n이 링크는 10분간 유효합니다.";
        mailService.sendText(email, "[전세역전] 패스워드리스 등록 안내", body);
    }

    /*
      재발급 링크 교환: 메일 속 broker_resend 토큰을 실제 signupToken(broker_signup)으로 바꿔 준다.
      프론트가 "QR 코드 발급" 버튼을 눌렀을 때만 호출해야 한다.
    */
    public String exchangeResendLink(String email, String linkToken) {
        if (email == null || email.isBlank()
                || linkToken == null || linkToken.isBlank()
                || !jwtTokenProvider.validateToken(linkToken)
                || !jwtTokenProvider.isTokenType(linkToken, JwtTokenProvider.TYPE_BROKER_RESEND)
                || !email.equals(jwtTokenProvider.getEmail(linkToken))) {
            throw new IllegalArgumentException("본인 확인에 실패했습니다.");
        }

        Member member = memberRepository.findByEmail(email);
        if (member == null) {
            throw new IllegalArgumentException("본인 확인에 실패했습니다.");
        }

        return jwtTokenProvider.createBrokerSignupToken(member);
    }
}
