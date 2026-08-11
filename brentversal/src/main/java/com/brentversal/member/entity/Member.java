package com.brentversal.member.entity;

import com.brentversal.member.constant.Role;
import com.brentversal.member.constant.SocialType;
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

    // 소셜 로그인은 회원당 하나만 연결할 수 있고, 한 번 연결하면 영구 고정이다(전환/해지 불가).
    // 그래서 별도 테이블이 아니라 Member 컬럼 세 개로 둔다. 기본값은 미연결(NONE).
    @Enumerated(EnumType.STRING)
    @Column(name = "social_type", nullable = false)
    private SocialType socialType = SocialType.NONE ;


    @Column(name = "social_user_id", unique = true)
    private String socialUserId ;

    // 연결 당시 제공자가 알려준 이메일. 참고용이며 로그인 키로 쓰지 않는다.
    @Column(name = "social_email")
    private String socialEmail ;

    // passwordx1080 등록 여부만 본다. 기기별 이름/최근 사용 시각 같은 상세 관리는 하지 않는다.
    // 실제 기기 자격증명 관리는 passwordx1080 쪽 책임이고, 우리 DB는 등록 완료 여부만 갖는다.
    @Column(name = "passwordless_registered", nullable = false)
    private boolean passwordlessRegistered = false ;

    @JsonFormat(pattern = "yyyy-MM-dd")
    @Column(nullable = false)
    private LocalDate regdate ; // 등록 일자

    // 로그인 시 발급한 refresh token을 DB에 저장해 두는 컬럼
    // 로그아웃하거나 탈취가 의심되면 이 값을 비워서 강제로 무효화할 수 있음
    // refresh token이 470자를 넘어서 넉넉히 1000으로 잡음
    @Column(name = "refresh_token", length = 1000)
    private String refreshToken ;

    // 중개인일 때만 존재하는 1:1 프로필. 일반 사용자는 NULL임
    // Broker 쪽이 자기 PK와 member_id FK를 따로 가지므로(Cart.member와 같은 방식) 여기는 mappedBy로 위임함
    // (소셜/패스워드리스는 위에서 Member 컬럼으로 흡수해서, 연관관계로 남은 건 Broker뿐이다)
    @ToString.Exclude // 양방향 연관을 toString에 넣으면 서로를 무한히 참조한다
    @OneToOne(mappedBy = "member", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private Broker broker ;
}