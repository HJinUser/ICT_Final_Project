package com.brentversal.member.controller;

import com.brentversal.member.dto.PasswordResetDto;
import com.brentversal.member.service.PasswordResetService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/*
  비밀번호 찾기(재설정) 엔드포인트.

  MemberController 에 넣지 않고 따로 둔 이유는, 그 파일이 이미 로그인·재발급·로그아웃·가입까지
  맡고 있어서 더 길어지면 읽기 어려워지기 때문이다. 경로 앞자리(/member)는 그대로 맞춘다.

  세 엔드포인트 모두 로그인하지 않은 사람이 부르므로 SecurityConfig 의 permitUrls 에 넣어 둔다.

  [응답 코드 규칙]
  - 400 : 입력값이 잘못된 경우 (빈 값, 틀린 인증번호, 비밀번호 규칙 위반, 만료된 토큰)
  - 409 : 지금 상태로는 진행할 수 없는 경우 (쿨타임, 만료, 횟수 초과, 무비밀번호 계정, 메일 발송 실패)
  프론트는 어느 쪽이든 본문의 message 를 그대로 보여 주면 된다.
*/
@RestController
@RequestMapping("/member/password")
@RequiredArgsConstructor
public class PasswordResetController {

    private final PasswordResetService passwordResetService;

    /*
      1단계: 이메일로 인증번호 발송.

      [가입 여부 숨김]
      가입되지 않은 이메일이면 서비스가 아무 일도 하지 않고 정상 종료하는데,
      여기서는 그 경우와 실제로 보낸 경우를 구분하지 않고 같은 응답을 돌려준다.
      응답 내용이 달라지면 그것만으로 가입 여부를 알아낼 수 있기 때문이다.
    */
    @PostMapping("/reset/send")
    public ResponseEntity<?> send(@RequestBody PasswordResetDto.SendRequest request) {
        // 메일 발송 등 외부 호출 중 오류가 날 수 있어 예외 처리 범위로 묶어둔다
        try {
            passwordResetService.sendCode(request.getEmail());
            return ResponseEntity.ok(Map.of(
                    "message", "입력하신 이메일로 인증번호를 보냈습니다. 5분 안에 입력해 주세요."));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", e.getMessage()));
        }
    }

    // 2단계: 인증번호 확인. 맞으면 마지막 단계에서 쓸 재설정 토큰을 돌려준다.
    @PostMapping("/reset/verify")
    public ResponseEntity<?> verify(@RequestBody PasswordResetDto.VerifyRequest request) {
        try {
            String resetToken = passwordResetService.verifyCode(
                    request.getEmail(),
                    request.getCode());

            return ResponseEntity.ok(Map.of(
                    "resetToken", resetToken,
                    "message", "인증이 완료되었습니다."));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", e.getMessage()));
        }
    }

    // 3단계: 새 비밀번호 저장. 대상 회원은 resetToken 안의 이메일로만 정한다.
    @PostMapping("/reset/confirm")
    public ResponseEntity<?> confirm(@RequestBody PasswordResetDto.ConfirmRequest request) {
        try {
            passwordResetService.confirmNewPassword(
                    request.getResetToken(),
                    request.getNewPassword());

            return ResponseEntity.ok(Map.of(
                    "message", "비밀번호가 변경되었습니다. 새 비밀번호로 로그인해 주세요."));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", e.getMessage()));
        } catch (EntityNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", e.getMessage()));
        }
    }
}
