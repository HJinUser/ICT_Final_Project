package com.brentversal.Member.entity;

import com.brentversal.Member.constant.Role;
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
// 인증수단과 중개인 전용 정보를 다른 테이블로 분리함
@Getter @Setter @ToString @Entity
@Table(
        name = "members",
        // 이메일은 소셜 로그인의 기준 + 로그인 ID라서 유일속성 이여야함
        uniqueConstraints = @UniqueConstraint(name = "uk_members_email", columnNames = "email")
)
public class Member {
    @Id
    // MySQL 에서는 IDENTITY(AUTO_INCREMENT)가 정석이다.
    // AUTO 로 두면 Hibernate 6 이 별도 시퀀스 테이블을 만들어 관리하므로 불필요한 테이블이 하나 더 생긴다.
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "member_id")
    private Long id;

    @Column(name = "name", nullable = false, length = 30)
    private String name;

    // 010-0000-0000 형태로 하이픈까지 저장(13 글자)
    // 중복 안됨
    @Column(name = "phone", nullable = false, length = 13)
    private String phone;

    @Column(name = "email", nullable = false, length = 255)
    private String email;

    // 소셜로 가입한 회원과 자체가입 중개인은 비밀번호가 없다. 그래서 NULL 을 허용한다.
    // 저장되는 값은 항상 BCrypt 해시이며, 원문 비밀번호 규칙 검증은 DTO 에서 한다.
    // 비밀번호가 NULL 인 회원이 자체 로그인을 시도하면 컨트롤러에서 막아야 한다(그대로 두면 인증 과정에서 터진다).
    @ToString.Exclude // 해시라도 로그에 찍히지 않게 제외한다
    @Column(name = "password", length = 255)
    private String password;

    // "OO시 OO구" 까지만 받는 선택 항목. 자체가입/소셜 어느 경로든 선택이다.
    @Column(name = "address", length = 100)
    private String address;

    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false, length = 20)
    private Role role;

    // 이메일 소유 인증 완료 여부.
    // 기기 분실 시 새 기기 등록을 이메일로 처리하므로, 이 값이 false 인 계정은 복구 경로가 없는 셈이다.
    // 소셜이 검증된 이메일(구글 email_verified, 카카오 is_email_verified)을 준 경우에는 인증 없이 바로 true 로 둔다.
    @Column(name = "email_verified", nullable = false)
    private boolean emailVerified = false;

    @JsonFormat(pattern = "yyyy-MM-dd")
    @Column(name = "regdate", nullable = false)
    private LocalDate regdate;

    // [refresh] 로그인 시 발급한 refresh token 을 DB 에 저장해 두는 컬럼.
    // [refresh] 서버가 값을 보관하므로, 로그아웃하거나 탈취가 의심되면 이 값을 비워서 강제로 무효화할 수 있다.
    // [refresh] RSA 2048 서명만 base64 로 344자라, 실제 발급되는 refresh token 이 470자를 넘는다. 넉넉히 1000 으로 잡는다.
    @ToString.Exclude
    @Column(name = "refresh_token", length = 1000)
    private String refreshToken;

    // 중개인일 때만 존재하는 1:1 프로필. 일반 사용자는 NULL 이다.
    // 연관관계의 주인은 Broker 쪽(member_id 를 가진 쪽)이라 mappedBy 로 위임한다.
//    @ToString.Exclude // 양방향 연관을 toString 에 넣으면 서로를 무한히 참조한다
//    @OneToOne(mappedBy = "member", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
//    private Broker broker;
//
//    // 한 계정에 카카오/구글/네이버를 각각 연결할 수 있으므로 1:N 이다.
//    @ToString.Exclude
//    @OneToMany(mappedBy = "member", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
//    private List<Social> socials = new ArrayList<>();
//
//    // 패스워드리스 등록 기기. 기기 분실에 대비해 여러 대를 등록할 수 있다.
//    @ToString.Exclude
//    @OneToMany(mappedBy = "member", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
//    private List<Device> devices = new ArrayList<>();
}