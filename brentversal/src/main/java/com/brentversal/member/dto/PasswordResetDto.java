package com.brentversal.member.dto;

import lombok.Getter;
import lombok.Setter;

/*
  비밀번호 재설정 3단계에서 주고받는 요청 본문들.

  단계마다 필요한 값이 다르고 셋 다 아주 짧아서, 파일 세 개로 나누는 대신
  바깥 클래스 하나에 모아 둔다. 한 흐름에 속한다는 것도 함께 드러난다.
*/
public class PasswordResetDto {

    // 담는 그릇 역할만 하는 클래스라 인스턴스를 만들지 못하게 막는다
    private PasswordResetDto() {
    }

    // 1단계: 이메일로 인증번호 발송 요청
    @Getter
    @Setter
    public static class SendRequest {
        private String email;
    }

    // 2단계: 받은 인증번호 확인 요청
    @Getter
    @Setter
    public static class VerifyRequest {
        private String email;
        private String code;
    }

    /*
      3단계: 새 비밀번호 설정 요청.

      여기서는 이메일을 받지 않는다. 클라이언트가 보낸 이메일을 믿으면
      2단계를 통과한 사람이 남의 이메일을 적어 그 계정의 비밀번호를 바꿀 수 있다.
      대상 회원은 항상 resetToken 안에 들어 있는 값으로만 정한다.
    */
    @Getter
    @Setter
    public static class ConfirmRequest {
        private String resetToken;
        private String newPassword;
    }
}
