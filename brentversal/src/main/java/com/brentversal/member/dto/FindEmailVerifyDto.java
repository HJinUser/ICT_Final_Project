package com.brentversal.member.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Getter;
import lombok.Setter;

// 이메일 찾기 2단계: 전화번호로 받은 인증번호를 확인하고, 맞으면 가려진 이메일을 돌려준다.
@Getter
@Setter
public class FindEmailVerifyDto {

    @NotBlank(message = "휴대폰 번호는 필수 입력 사항입니다.")
    @Pattern(regexp = "^01[016789]-\\d{3,4}-\\d{4}$", message = "010-0000-0000 형식으로 입력해 주세요.")
    private String phone;

    @NotBlank(message = "인증번호를 입력해 주세요.")
    @Pattern(regexp = "^\\d{6}$", message = "인증번호 6자리를 입력해 주세요.")
    private String code;
}
