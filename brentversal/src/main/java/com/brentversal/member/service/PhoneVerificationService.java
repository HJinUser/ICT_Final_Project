package com.brentversal.member.service;

import com.brentversal.common.sms.service.SmsService;
import com.brentversal.member.entity.PhoneVerification;
import com.brentversal.member.repository.PhoneVerificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;

// 전화번호 인증번호(6자리)의 발급/재전송 제한/검증을 담당한다.
// 지금은 이메일 찾기에서만 쓰지만, 나중에 회원가입 본인인증 등 다른 화면에서도 그대로 재사용할 수 있게
// "무엇을 위한 인증인지"는 이 서비스가 모르게(전화번호 하나만 받게) 만든다.
@Slf4j
@Service
@RequiredArgsConstructor
public class PhoneVerificationService {

    private final PhoneVerificationRepository phoneVerificationRepository;
    private final SmsService smsService;

    private static final long EXPIRATION_MINUTES = 5;
    private static final long RESEND_COOLDOWN_SECONDS = 30;

    private final SecureRandom random = new SecureRandom();

    // 인증번호를 새로 발급해 문자로 보낸다. 직전 발급이 쿨다운(30초) 안이면 재전송을 막는다.
    @Transactional
    public void sendCode(String phone) {
        LocalDateTime now = LocalDateTime.now();

        phoneVerificationRepository.findTopByPhoneOrderByIdDesc(phone).ifPresent(last -> {
            if (last.getLastSentAt().plusSeconds(RESEND_COOLDOWN_SECONDS).isAfter(now)) {
                throw new IllegalArgumentException("잠시 후 다시 시도해 주세요.");
            }
        });

        String code = generateCode();

        PhoneVerification verification = new PhoneVerification();
        verification.setPhone(phone);
        verification.setCode(code);
        verification.setExpiresAt(now.plusMinutes(EXPIRATION_MINUTES));
        verification.setLastSentAt(now);
        phoneVerificationRepository.save(verification);

        smsService.send(phone, "[전세역전] 인증번호는 " + code + " 입니다. " + EXPIRATION_MINUTES + "분 이내에 입력해 주세요.");
    }

    // 인증번호가 맞는지 확인한다. 유효하면 verified로 표시하고, 아니면 구체적인 사유를 예외 메시지로 알려준다.
    @Transactional
    public void verifyCode(String phone, String code) {
        PhoneVerification verification = phoneVerificationRepository.findTopByPhoneOrderByIdDesc(phone)
                .orElseThrow(() -> new IllegalArgumentException("인증 요청 내역이 없습니다. 인증번호를 다시 요청해 주세요."));

        if (verification.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new IllegalArgumentException("인증번호가 만료되었습니다. 다시 요청해 주세요.");
        }
        if (!verification.getCode().equals(code)) {
            throw new IllegalArgumentException("인증번호가 일치하지 않습니다.");
        }

        verification.setVerified(true);
    }

    private String generateCode() {
        int number = random.nextInt(1_000_000);
        return String.format("%06d", number);
    }
}
