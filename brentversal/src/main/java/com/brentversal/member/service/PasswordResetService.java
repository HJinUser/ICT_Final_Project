package com.brentversal.member.service;

import com.brentversal.common.config.JwtTokenProvider;
import com.brentversal.common.mail.MailService;
import com.brentversal.member.constant.SocialType;
import com.brentversal.member.entity.Member;
import com.brentversal.member.entity.PasswordResetCode;
import com.brentversal.member.repository.MemberRepository;
import com.brentversal.member.repository.PasswordResetCodeRepository;
import com.brentversal.member.validation.PasswordPolicy;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.LocalDateTime;

/*
  비밀번호 찾기(재설정) 흐름.

  1) sendCode      : 이메일로 6자리 인증번호를 보낸다
  2) verifyCode    : 받은 번호가 맞으면 10분짜리 재설정 토큰을 내준다
  3) confirmNewPassword : 그 토큰과 새 비밀번호로 실제 변경을 끝낸다

  [적용한 정책]
  - 가입 여부 숨김 : 없는 이메일이어도 화면에는 똑같이 "보냈습니다"라고 답한다
  - 시도 횟수 제한 : 번호를 5회 틀리면 그 코드를 버린다
  - 만료 5분      : 발급 후 5분이 지나면 못 쓴다
  - 재전송 쿨타임  : 직전 발급으로부터 60초 안에는 다시 보내지 않는다
  - 무비밀번호 계정 차단 : 중개인(패스워드리스 전용)과 소셜 가입 회원은 대상이 아니다
*/
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PasswordResetService {

    private final MemberRepository memberRepository;
    private final PasswordResetCodeRepository passwordResetCodeRepository;
    private final PasswordEncoder passwordEncoder;
    private final MailService mailService;
    private final JwtTokenProvider jwtTokenProvider;

    // ── 정책 값 ──────────────────────────────────────────
    private static final int CODE_LENGTH = 6;
    private static final Duration CODE_TTL = Duration.ofMinutes(5);
    private static final Duration RESEND_COOLDOWN = Duration.ofSeconds(60);
    private static final int MAX_ATTEMPTS = 5;

    // 인증번호는 추측 가능하면 안 되므로 Random 이 아니라 SecureRandom 을 쓴다.
    // Random 은 시드만 알면 다음 값을 계산할 수 있다.
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    /*
      1단계: 인증번호를 만들어 메일로 보낸다.

      가입되지 않은 이메일이면 아무 일도 하지 않고 조용히 끝낸다(예외를 던지지 않는다).
      호출한 컨트롤러는 어느 경우든 같은 성공 응답을 돌려주므로, 요청한 쪽에서는
      그 이메일이 가입돼 있는지 알 수 없다.
    */
    @Transactional
    public void sendCode(String email) {
        // null 체크는 다른 조건 검사보다 먼저 수행한다
        if (email == null || email.isBlank()) {
            throw new IllegalArgumentException("이메일을 입력해 주세요.");
        }

        String normalized = normalize(email);
        Member member = memberRepository.findByEmail(normalized);

        // [가입 여부 숨김] 여기서 "없는 이메일입니다"를 돌려주면, 공격자가 주소를 하나씩 넣어 보며
        // 실제로 가입된 이메일 목록을 만들어 낼 수 있다. 로그에만 남기고 정상 종료한다.
        if (member == null) {
            log.info("비밀번호 재설정 요청 - 가입되지 않은 이메일 (요청자에게는 알리지 않음)");
            return;
        }

        // [무비밀번호 계정 차단] 이 경우만은 이유를 알려 준다.
        // 조용히 넘기면 사용자가 오지 않을 메일을 계속 기다리게 된다.
        // 가입 여부가 드러나긴 하지만, 로그인 화면에서 해당 방식으로 시도해 보면 어차피 알 수 있는 정보다.
        if (!hasPassword(member)) {
            throw new IllegalStateException(describePasswordlessAccount(member));
        }

        // [재전송 쿨타임] 직전 발급이 60초 안이면 거절한다. 메일 폭탄과 대량 발송을 막는다.
        LocalDateTime now = LocalDateTime.now();
        PasswordResetCode previous = passwordResetCodeRepository
                .findTopByEmailOrderByCreatedAtDesc(normalized)
                .orElse(null);

        if (previous != null) {
            LocalDateTime allowedAt = previous.getCreatedAt().plus(RESEND_COOLDOWN);
            if (now.isBefore(allowedAt)) {
                // 남은 초를 올림해서 알려 준다(0초 남았다고 안내하고 거절하는 상황을 피한다)
                long waitSeconds = Duration.between(now, allowedAt).getSeconds() + 1;
                throw new IllegalStateException(waitSeconds + "초 후에 다시 요청해 주세요.");
            }
        }

        // 이전 코드는 지운다. 남겨 두면 예전 메일의 번호로도 비밀번호를 바꿀 수 있다.
        passwordResetCodeRepository.deleteByEmail(normalized);

        String code = generateCode();

        PasswordResetCode entity = new PasswordResetCode();
        entity.setEmail(normalized);
        entity.setCodeHash(passwordEncoder.encode(code)); // 평문은 저장하지 않는다
        entity.setCreatedAt(now);
        entity.setExpiresAt(now.plus(CODE_TTL));
        passwordResetCodeRepository.save(entity);

        // 메일 발송이 실패하면 MailService 가 IllegalStateException 을 던진다.
        // 그러면 이 트랜잭션이 통째로 롤백되어 코드도 저장되지 않는다.
        // 보내지도 못한 코드가 DB 에 남아 쿨타임만 잡아먹는 상황을 막으려는 의도적인 동작이다.
        mailService.sendText(
                normalized,
                "[전세역전] 비밀번호 재설정 인증번호",
                buildMailBody(code));

        log.info("비밀번호 재설정 인증번호 발송 - memberId={}", member.getId());
    }

    /*
      2단계: 인증번호를 대조하고, 맞으면 재설정 토큰을 돌려준다.

      [noRollbackFor 를 붙인 이유]
      번호가 틀렸을 때 attemptCount 를 올리고 예외를 던지는데, 기본 설정에서는
      RuntimeException 이 나가면 트랜잭션이 롤백되어 그 증가분이 사라진다.
      그러면 몇 번을 틀려도 횟수가 0 으로 유지되어 시도 횟수 제한이 아무 역할을 못 한다.
      두 예외에 한해 롤백하지 않도록 지정해서, 실패 기록은 남기고 예외는 그대로 올려보낸다.
    */
    @Transactional(noRollbackFor = {IllegalArgumentException.class, IllegalStateException.class})
    public String verifyCode(String email, String code) {
        // null 체크는 다른 조건 검사보다 먼저 수행한다
        if (email == null || email.isBlank() || code == null || code.isBlank()) {
            throw new IllegalArgumentException("이메일과 인증번호를 모두 입력해 주세요.");
        }

        String normalized = normalize(email);

        PasswordResetCode saved = passwordResetCodeRepository
                .findTopByEmailOrderByCreatedAtDesc(normalized)
                .orElseThrow(() -> new IllegalArgumentException("인증번호를 먼저 요청해 주세요."));

        if (saved.isUsed()) {
            throw new IllegalStateException("이미 사용한 인증번호입니다. 다시 요청해 주세요.");
        }

        if (LocalDateTime.now().isAfter(saved.getExpiresAt())) {
            throw new IllegalStateException("인증번호가 만료되었습니다. 다시 요청해 주세요.");
        }

        if (saved.getAttemptCount() >= MAX_ATTEMPTS) {
            throw new IllegalStateException("입력 가능 횟수를 넘었습니다. 인증번호를 다시 요청해 주세요.");
        }

        if (!passwordEncoder.matches(code.trim(), saved.getCodeHash())) {
            // 영속 상태 엔터티라 값만 바꿔도 트랜잭션이 끝날 때 UPDATE 가 나간다
            saved.setAttemptCount(saved.getAttemptCount() + 1);

            int left = MAX_ATTEMPTS - saved.getAttemptCount();
            throw new IllegalArgumentException(left > 0
                    ? "인증번호가 올바르지 않습니다. (남은 횟수 " + left + "회)"
                    : "입력 가능 횟수를 넘었습니다. 인증번호를 다시 요청해 주세요.");
        }

        // 여기서 바로 used 로 바꾸지 않는다.
        // 아직 새 비밀번호를 받지 않았고, 3단계에서 비밀번호 규칙에 걸려 되돌아올 수 있기 때문이다.
        // 실제 변경이 끝나는 시점(confirmNewPassword)에 used 로 막는다.
        return jwtTokenProvider.createPasswordResetToken(normalized);
    }

    /*
      3단계: 재설정 토큰을 확인하고 새 비밀번호를 저장한다.

      대상 회원은 클라이언트가 보낸 이메일이 아니라 토큰 안의 값으로만 정한다.
      요청 본문의 이메일을 믿으면, 자기 이메일로 인증을 통과한 사람이
      남의 이메일을 적어 그 계정의 비밀번호를 바꿔 버릴 수 있다.
    */
    @Transactional
    public void confirmNewPassword(String resetToken, String newPassword) {
        // null 체크는 다른 조건 검사보다 먼저 수행한다
        if (resetToken == null || resetToken.isBlank()) {
            throw new IllegalArgumentException("인증 정보가 없습니다. 처음부터 다시 진행해 주세요.");
        }

        // 서명·만료 검증과 종류 검증을 함께 한다.
        // 종류를 보지 않으면 같은 키로 서명된 access token 으로도 비밀번호를 바꿀 수 있게 된다.
        if (!jwtTokenProvider.validateToken(resetToken)
                || !jwtTokenProvider.isTokenType(resetToken, JwtTokenProvider.TYPE_PASSWORD_RESET)) {
            throw new IllegalArgumentException("인증이 만료되었습니다. 처음부터 다시 진행해 주세요.");
        }

        String email = jwtTokenProvider.getEmail(resetToken);

        // 새 비밀번호도 가입 때와 똑같은 규칙을 적용한다
        PasswordPolicy.validate(newPassword);

        Member member = memberRepository.findByEmail(email);
        if (member == null) {
            throw new EntityNotFoundException("회원 정보를 찾을 수 없습니다.");
        }

        // 토큰을 받은 뒤 계정 상태가 달라졌을 수 있어 한 번 더 확인한다
        if (!hasPassword(member)) {
            throw new IllegalStateException(describePasswordlessAccount(member));
        }

        PasswordResetCode saved = passwordResetCodeRepository
                .findTopByEmailOrderByCreatedAtDesc(email)
                .orElseThrow(() -> new IllegalStateException(
                        "인증 기록을 찾을 수 없습니다. 처음부터 다시 진행해 주세요."));

        // 같은 토큰으로 두 번 바꾸지 못하게 막는다.
        // 토큰은 10분간 유효하므로, 이 표시가 없으면 그 사이에 몇 번이든 재사용할 수 있다.
        if (saved.isUsed()) {
            throw new IllegalStateException("이미 사용한 인증번호입니다. 처음부터 다시 진행해 주세요.");
        }

        saved.setUsed(true);
        member.setPassword(passwordEncoder.encode(newPassword));

        // 비밀번호를 바꿨으면 기존에 남아 있던 로그인도 끊는다.
        // refresh token 을 비워야, 비밀번호가 샜던 상황에서 남의 기기에 남은 로그인이 이어지지 않는다.
        member.setRefreshToken(null);

        log.info("비밀번호 재설정 완료 - memberId={}", member.getId());
    }

    // ── 내부 도우미 ──────────────────────────────────────

    // 대소문자나 앞뒤 공백 때문에 다른 사람으로 취급되지 않도록 이메일을 한 형태로 맞춘다
    private String normalize(String email) {
        return email.trim().toLowerCase();
    }

    // 소셜 가입 회원과 중개인은 비밀번호 자체가 없어서(MemberService.insert 참고) null 이 들어 있다
    private boolean hasPassword(Member member) {
        return member.getPassword() != null && !member.getPassword().isBlank();
    }

    // 비밀번호가 없는 계정에 어떤 로그인 방법을 안내할지 정한다
    private String describePasswordlessAccount(Member member) {
        if (member.getSocialType() != null && member.getSocialType() != SocialType.NONE) {
            return member.getSocialType().name()
                    + " 소셜 로그인으로 가입한 계정입니다. 소셜 로그인을 이용해 주세요.";
        }
        return "패스워드리스 로그인 전용 계정입니다. 로그인 화면의 '패스워드리스 로그인'을 이용해 주세요.";
    }

    /*
      6자리 인증번호를 만든다.

      숫자로 다루면 앞자리 0 이 사라져 5자리가 되므로(예: 012345 → 12345)
      처음부터 자릿수를 채운 문자열로 만든다.
    */
    private String generateCode() {
        int number = SECURE_RANDOM.nextInt(1_000_000); // 0 ~ 999999
        return String.format("%0" + CODE_LENGTH + "d", number);
    }

    private String buildMailBody(String code) {
        return """
                전세역전 비밀번호 재설정 인증번호입니다.

                인증번호: %s

                이 번호는 %d분 동안만 사용할 수 있습니다.
                본인이 요청하지 않았다면 이 메일을 무시해 주세요.
                """.formatted(code, CODE_TTL.toMinutes());
    }
}
