package com.brentversal.member.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

// 전화번호 인증(6자리) 요청 1건. 이메일 찾기 등, 전화번호로 본인 확인이 필요한 곳에서 공통으로 쓴다.
// 같은 전화번호로 재요청하면 새 행을 새로 추가하고, 검증할 때는 가장 최근 행만 본다.
@Entity
@Table(name = "phone_verifications")
@Getter
@Setter
public class PhoneVerification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "phone_verification_id")
    private Long id;

    @Column(nullable = false)
    private String phone;

    @Column(nullable = false, length = 6)
    private String code;

    // 인증 성공 여부. 검증 API가 code까지 맞춰도, 이 값을 별도로 확인해 재사용(재검증) 흔적을 남긴다.
    @Column(nullable = false)
    private boolean verified = false;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    // 재전송 쿨다운 판단 기준 시각
    @Column(name = "last_sent_at", nullable = false)
    private LocalDateTime lastSentAt;
}
