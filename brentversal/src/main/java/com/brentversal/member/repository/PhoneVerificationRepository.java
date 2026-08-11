package com.brentversal.member.repository;

import com.brentversal.member.entity.PhoneVerification;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PhoneVerificationRepository extends JpaRepository<PhoneVerification, Long> {
    // 같은 전화번호로 여러 번 요청할 수 있으므로, 재전송 쿨다운/코드 검증 모두 가장 최근(id가 가장 큰) 한 건만 본다.
    Optional<PhoneVerification> findTopByPhoneOrderByIdDesc(String phone);
}
