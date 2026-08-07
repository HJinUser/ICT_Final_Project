package com.brentversal.member.entity;

import com.brentversal.member.constant.Role;
import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

import java.time.LocalDate;

// 회원 1명을 의미하는 엔터티 클래스
@Getter
@Setter
@ToString
@Entity // JPA에게 이 클래스는 DB랑 연결해서 관리해야 할 클래스라는 것을 알리는 어노테이션
@Table(name = "members") // 테이블로 설정하고 테이블 이름을 설정함
public class Member {
    @Id // 프라이머리 키로 설정하기
    @GeneratedValue(strategy = GenerationType.IDENTITY) //AUTO로 쓰면 시퀀스가 하나 더 만들어짐
    @Column(name = "member_id") // pk컬럼명 : 테이블단수명_id
    private Long id ;
    // id를 int가 아니라 Long으로 설정 (Long이 더 큰 숫자를 담을 수 있어서 관례임)

    @Column(nullable = false)
    @NotBlank(message = "이름은 필수 입력 사항입니다.")  // 빈칸으로 두면 안되게 설정하고 텍스트를 표시함(데이터베이스의 제약조건느낌)
    private String name ;

    // 010-0000-0000 형태로 하이픈까지 저장(13자리)
    @Column(unique = true, nullable = false)
    @NotBlank(message = "휴대폰 번호는 필수 입력 사항입니다.")
    @Pattern(regexp = "^01[016789]-\\d{3,4}-\\d{4}$", message = "010-0000-0000 형식으로 입력해 주세요.")
    private String phone ;

    // 이메일은 소셜 로그인의 기준 + 로그인 ID라서 유일해야 함
    @Column(unique = true, nullable = false)
    @NotBlank(message = "이메일은 필수 입력 사항입니다.")
    @Email(message = "올바른 이메일 형식으로 입력해 주셔야 합니다.")
    private String email ;

    // 소셜로 가입한 회원과 자체가입 중개인은 비밀번호가 없어서 NULL을 허용함
    // 그래서 여기에는 @NotBlank를 붙이지 않고, 원문 비밀번호 규칙 검증은 DTO에서 함
    // 저장되는 값은 항상 BCrypt 해시임
    @ToString.Exclude // 해시라도 로그에 찍히지 않게 제외한다
    @Size(max = 255, message = "비밀 번호는 255자리 이하로 입력해 주세요.")
    private String password ;

    // "OO시 OO구"까지만 받는 선택 항목이라 nullable = false를 걸지 않음
    @Size(max = 100, message = "주소는 100자리 이하로 입력해 주세요.")
    private String address ;

    // Enum의 상수를 문자열 형태로 DB에 저장하겠다는 어노테이션
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role ;

    // 이메일 소유 인증 완료 여부
    // 소셜이 검증된 이메일을 준 경우에는 인증 없이 바로 true로 둠
    @Column(nullable = false)
    private boolean emailVerified = false ;

    @JsonFormat(pattern = "yyyy-MM-dd")
    @Column(nullable = false)
    private LocalDate regdate ; // 등록 일자

    // 로그인 시 발급한 refresh token을 DB에 저장해 두는 컬럼
    // 로그아웃하거나 탈취가 의심되면 이 값을 비워서 강제로 무효화할 수 있음
    // refresh token이 470자를 넘어서 넉넉히 1000으로 잡음
    @Column(name = "refresh_token", length = 1000)
    private String refreshToken ;

    // ---- 아래는 전부 @Transient: DB 컬럼이 아니라 회원가입 요청(JSON)을 받을 때만 잠깐 쓰는 값이다.
    // Member를 그대로 요청 body로 받는 기존 방식(entity-vs-dto.md의 Signup 사례)을 유지하기 위해
    // 별도 DTO를 만들지 않고 여기에 임시로 얹었다.

    // "USER" 또는 "BROKER". role은 클라이언트가 직접 정하면 권한 상승 위험이 있어서
    // 이 값만 받고, 실제 role은 서비스가 이 값을 보고 안전하게 정한다.
    @Transient
    private String signupType ;

    @Transient
    private String licenseNumber ; // 공인중개사 등록번호 -> Broker.licenseNumber 로 저장

    @Transient
    private String agencyName ; // 중개사무소명 -> Agency.name 으로 저장

    @Transient
    private String agencyAddress ; // 중개사무소 주소 -> Agency.address 로 저장

    @Transient
    private String officePhone ; // 사무실 번호 -> Agency.phone 으로 저장

//    // 중개인일 때만 존재하는 1:1 프로필. 일반 사용자는 NULL임
//    // @JoinColumn이 있는 Broker 쪽이 fk를 가지므로 여기는 mappedBy로 위임함
//    @OneToOne(mappedBy = "member", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
//    private Broker broker ;
//
//    // 한 계정에 카카오/구글/네이버를 각각 연결할 수 있으므로 1:N임
//    // mappedBy에는 자식 엔티티(Social)에 있는 fk 변수명을 적음
//    @OneToMany(mappedBy = "member", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
//    private List<Social> socials ;
//
//    // 패스워드리스 등록 기기. 기기 분실에 대비해 여러 대를 등록할 수 있음
//    @OneToMany(mappedBy = "member", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
//    private List<Device> devices ;
}