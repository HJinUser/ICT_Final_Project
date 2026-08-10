package com.brentversal.member.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

// 회원가입 요청 하나로 일반 사용자/중개인을 모두 받는다.
// Member 컬럼과 겹치는 값(name/phone/email/address/password)과, Member에는 없는
// 중개인 전용 값(licenseNumber/agencyName/agencyAddress/officePhone)을 한 곳에 담는다.
@Getter @Setter
public class SignupDto {

    private String signupType ; // "USER" 또는 "BROKER"

    @NotBlank(message = "이름은 필수 입력 사항입니다.")
    private String name ;

    @NotBlank(message = "휴대폰 번호는 필수 입력 사항입니다.")
    @Pattern(regexp = "^01[016789]-\\d{3,4}-\\d{4}$", message = "010-0000-0000 형식으로 입력해 주세요.")
    private String phone ;

    @NotBlank(message = "이메일은 필수 입력 사항입니다.")
    @Email(message = "올바른 이메일 형식으로 입력해 주셔야 합니다.")
    private String email ;

    @Size(max = 100, message = "주소는 100자리 이하로 입력해 주세요.")
    private String address ; // 선택 입력

    // 일반 사용자 전용. 중개인은 비밀번호 없이 가입한다.
    @Size(max = 255, message = "비밀 번호는 255자리 이하로 입력해 주세요.")
    private String password ;

    // 중개인 전용
    private String licenseNumber ;
    private String agencyName ;
    private String agencyAddress ;
    private String officePhone ;
}
