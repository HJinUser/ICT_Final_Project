package com.brentversal.member.repository;

import com.brentversal.member.entity.PasswordResetCode;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PasswordResetCodeRepository extends JpaRepository<PasswordResetCode, Long> {

    /*
      그 이메일로 가장 최근에 발급한 코드 1건.

      재전송 쿨타임 확인, 코드 검증, 최종 확정에서 모두 이 조회 하나만 쓴다.
      새 코드를 만들 때 이전 코드를 지우므로 사실상 1건만 남지만,
      혹시 여러 건이 남더라도 항상 최신 것만 인정하도록 정렬 조건을 넣어 둔다.
    */
    Optional<PasswordResetCode> findTopByEmailOrderByCreatedAtDesc(String email);

    /*
      새 코드를 발급하기 전에 그 이메일의 이전 코드를 모두 지운다.
      남겨 두면 예전에 받은 메일의 코드로도 비밀번호를 바꿀 수 있게 된다.
    */
    void deleteByEmail(String email);
}
