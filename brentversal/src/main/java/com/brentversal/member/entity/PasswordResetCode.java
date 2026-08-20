package com.brentversal.member.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

import java.time.LocalDateTime;

/*
  비밀번호 재설정 인증번호 1건.

  [메모리(Map)가 아니라 테이블로 두는 이유]
  - 백엔드를 재시작하면 발급해 둔 코드가 전부 사라진다. 배포할 때마다 사용자가 메일을 다시 받아야 한다.
  - 시도 횟수·만료·사용 여부를 남겨야 무작위 대입을 막을 수 있는데, 그 기록도 함께 날아간다.
  6자리 숫자는 경우의 수가 100만뿐이라 제한이 없으면 대입으로 뚫린다.

  [코드를 평문으로 저장하지 않는 이유]
  DB 를 볼 수 있는 사람이 남의 인증번호를 그대로 읽어 비밀번호를 바꿔 버릴 수 있다.
  회원 비밀번호와 같은 BCrypt 로 해시해서 넣고, 확인할 때는 matches() 로 대조한다.

  테이블은 ddl-auto=update 설정이라 서버가 뜰 때 자동으로 만들어진다.
*/
@Getter
@Setter
@ToString
@Entity
@Table(
        name = "password_reset_codes",
        // 이메일로 최신 1건을 찾는 조회가 발송·검증·확정 3단계에서 매번 일어나므로 인덱스를 건다
        indexes = @Index(name = "idx_password_reset_email", columnList = "email")
)
public class PasswordResetCode {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "password_reset_code_id")
    private Long id;

    /*
      회원 id 가 아니라 이메일 문자열로 잡아 둔다.

      가입되지 않은 이메일로 요청이 와도 화면에는 똑같이 "보냈습니다"라고 답해야 하는데(가입 여부 숨김),
      회원과의 연관관계를 필수로 두면 그 흐름 자체를 만들 수 없다.
      저장 전에 소문자로 맞춰 넣기 때문에 대소문자가 달라도 같은 행을 찾는다.
    */
    @Column(nullable = false, length = 255)
    private String email;

    // 6자리 숫자를 BCrypt 로 해시한 값. 평문은 메일로 보낸 뒤 서버에 남기지 않는다.
    @ToString.Exclude // 해시라도 로그에 찍히지 않게 제외한다
    @Column(name = "code_hash", nullable = false, length = 255)
    private String codeHash;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    // 코드를 틀린 횟수. 정해진 횟수를 넘기면 이 코드를 더 이상 받아 주지 않는다.
    @Column(name = "attempt_count", nullable = false)
    private int attemptCount = 0;

    // 비밀번호 변경까지 끝난 코드인지. 한 번 쓴 코드로 두 번 바꾸지 못하게 막는 표시다.
    @Column(nullable = false)
    private boolean used = false;

    // 재전송 쿨타임(60초)을 계산하는 기준 시각이기도 하다
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
}
