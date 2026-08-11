package com.brentversal.member.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Getter;
import lombok.Setter;

// 이메일 찾기 1단계: 이름 + 전화번호로 본인 확인 후 인증번호 문자를 발송한다.
@Getter
@Setter
public class FindEmailSendCodeDto {

    @NotBlank(message = "이름은 필수 입력 사항입니다.")
    private String name;

    @NotBlank(message = "휴대폰 번호는 필수 입력 사항입니다.")
    @Pattern(regexp = "^01[016789]-\\d{3,4}-\\d{4}$", message = "010-0000-0000 형식으로 입력해 주세요.")
    private String phone;
}
