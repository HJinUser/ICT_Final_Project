package com.brentversal.member.entity;

import com.brentversal.member.constant.LicenseType;
import com.brentversal.member.constant.VerifyStatus;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

// 중개인 회원 1명의 자격 정보. Member와 1:1이며, Broker가 FK(member_id)를 가진 주인(owning side)이다.
// (수업의 Cart.member @OneToOne + @JoinColumn과 같은 방식. unique 제약으로 회원 1명당 1개만 허용한다.)
@Getter
@Setter
@ToString
@Entity
@Table(name = "brokers")
public class Broker {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "broker_id")
    private Long id ;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id", nullable = false, unique = true)
    @ToString.Exclude
    private Member member ;

    @Column(name = "license_number", nullable = false)
    private String licenseNumber ; // 공인중개사 등록번호

    // 형식 자동판별(연도별 규칙)은 아직 구현하지 않아 우선 UNKNOWN으로 고정한다.
    @Enumerated(EnumType.STRING)
    @Column(name = "license_type", nullable = false)
    private LicenseType licenseType = LicenseType.UNKNOWN ;

    // 서류 검증 상태. 가입 시점에는 항상 미검증이며, 관리자 심사(허가요청)를 거쳐 바뀐다.
    @Enumerated(EnumType.STRING)
    @Column(name = "verify_status", nullable = false)
    private VerifyStatus verifyStatus = VerifyStatus.UNVERIFIED ;
}
