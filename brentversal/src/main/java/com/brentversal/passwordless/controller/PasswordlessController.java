package com.brentversal.passwordless.controller;

import com.brentversal.member.entity.Member;
import com.brentversal.member.repository.MemberRepository;
import com.brentversal.passwordless.frontDto.AuthResultDto;
import com.brentversal.passwordless.frontDto.AuthStartDto;
import com.brentversal.passwordless.frontDto.RegisterInfoDto;
import com.brentversal.passwordless.service.PasswordlessService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/passwordless")
@RequiredArgsConstructor
public class PasswordlessController {

    private final PasswordlessService passwordlessService;
    // 로그인 성공 시 일반 로그인(MemberController.login)과 동일한 모양으로 회원 정보를 같이 내려주기 위해 필요하다.
    private final MemberRepository memberRepository;

    // 등록 정보(QR) 요청 — 로그인 페이지에서 이메일+비밀번호로 본인 확인 후 호출
    // 비밀번호가 있는 계정은 password로, 중개인처럼 비밀번호가 없는 계정은 회원가입 때 받은 signupToken으로 본인 확인한다 (PasswordlessService.verifyForRegister 참고).
    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody Map<String, String> body){
        try {
            RegisterInfoDto dto = passwordlessService.requestRegister(
                    body.get("email"), body.get("password"), body.get("signupToken"));
            return ResponseEntity.ok(dto);
        } catch (IllegalArgumentException e){
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", e.getMessage()));
        } catch (IllegalStateException e){
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", e.getMessage()));
        }
    }

    // 등록 완료 확인 (모바일 QR 등록 후 프론트가 호출)
    @PostMapping("/register/confirm")
    public ResponseEntity<Map<String, Boolean>> confirmRegister(@RequestBody Map<String, String> body){
        boolean registered = passwordlessService.confirmRegister(body.get("email"));
        return ResponseEntity.ok(Map.of("registered", registered));
    }

    // 로그인 1단계: 인증 시작(자동패스워드 생성)
    @PostMapping("/login/start")
    public ResponseEntity<?> loginStart(@RequestBody Map<String, String> body, HttpServletRequest request){
        try {
            String clientIp = request.getRemoteAddr();
            AuthStartDto dto = passwordlessService.startLogin(body.get("email"), clientIp);
            return ResponseEntity.ok(dto);
        } catch (IllegalStateException e){
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", e.getMessage()));
        }
    }

    // 로그인 2단계: 승인 결과 폴링. 승인(Y)이면 일반 로그인과 동일한 모양(accessToken/refreshToken/회원정보)으로 응답한다.
    @PostMapping("/login/result")
    public ResponseEntity<?> loginResult(@RequestBody Map<String, String> body){
        String email = body.get("email");
        AuthResultDto result = passwordlessService.checkLogin(email, body.get("sessionId"));

        if (!"Y".equals(result.getStatus())){
            return ResponseEntity.ok(Map.of("status", result.getStatus()));
        }

        Member member = memberRepository.findByEmail(email);
        return ResponseEntity.ok(Map.ofEntries(
                Map.entry("status", "Y"),
                Map.entry("accessToken", result.getAccessToken()),
                Map.entry("refreshToken", result.getRefreshToken()),
                Map.entry("id", member.getId()),
                Map.entry("name", member.getName()),
                Map.entry("email", member.getEmail()),
                Map.entry("role", member.getRole().toString()),
                Map.entry("address", member.getAddress() == null ? "" : member.getAddress()),
                Map.entry("sigungu", member.getSigungu() == null ? "" : member.getSigungu()),
                Map.entry("preferenceCompleted", member.isPreferenceCompleted()),
                Map.entry("socialType", member.getSocialType().toString())
        ));
    }

    // 로그인 취소
    @PostMapping("/login/cancel")
    public ResponseEntity<Void> loginCancel(@RequestBody Map<String, String> body){
        passwordlessService.cancelLogin(body.get("email"), body.get("sessionId"));
        return ResponseEntity.ok().build();
    }

    // 해지 — 로그인 페이지에서 이메일+비밀번호로 본인 확인 후 호출 (비밀번호 없는 계정 대응은 추후 처리)
    @PostMapping("/withdrawal")
    public ResponseEntity<?> withdrawal(@RequestBody Map<String, String> body){
        try {
            passwordlessService.withdrawal(body.get("email"), body.get("password"));
            return ResponseEntity.ok().build();
        } catch (IllegalArgumentException e){
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", e.getMessage()));
        } catch (IllegalStateException e){
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", e.getMessage()));
        }
    }
    // 중도에 등록을 포기한 중개인을 위한 등록 링크 재발급.
    // 이메일만 받아서, 본인 확인은 URL 접근 자체가 아니라 그 이메일함에 실제로 접근할 수 있는지로 대신한다.
    // (BROKER이고 아직 미등록인 계정인지는 서비스 쪽에서 확인함)
    @PostMapping("/register/resend")
    public ResponseEntity<?> resend(@RequestBody Map<String, String> body){
        try {
            passwordlessService.resendSignupToken(body.get("email"));
            return ResponseEntity.ok(Map.of("message", "등록 안내 메일을 보냈습니다."));
        } catch (IllegalArgumentException e){
            // 대상이 아닌 계정(존재하지 않거나, 브로커가 아니거나, 이미 비밀번호가 있는 경우)
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", e.getMessage()));
        } catch (IllegalStateException e){
            // 이미 패스워드리스 등록이 끝난 계정 — 재발급 대상이 아님
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", e.getMessage()));
        }
    }

    // 재발급 링크 교환 — "QR 코드 발급" 버튼을 누른 순간에만 호출해야 한다.
    @PostMapping("/register/resend/exchange")
    public ResponseEntity<?> resendExchange(@RequestBody Map<String, String> body){
        try {
            String signupToken = passwordlessService.exchangeResendLink(body.get("email"), body.get("linkToken"));
            return ResponseEntity.ok(Map.of("signupToken", signupToken));
        } catch (IllegalArgumentException e){
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", e.getMessage()));
        } catch (IllegalStateException e){
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", e.getMessage()));
        }
    }

    // 등록 여부 조회 (로그인 화면에서 패스워드리스 버튼 노출 판단용)
    @GetMapping("/status")
    public ResponseEntity<Map<String, Boolean>> status(@RequestParam String email){
        return ResponseEntity.ok(Map.of("registered", passwordlessService.isRegistered(email)));
    }
}
