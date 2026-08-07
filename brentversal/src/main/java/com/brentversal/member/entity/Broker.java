package com.brentversal.member.entity;

import com.brentversal.member.constant.LicenseType;
import com.brentversal.member.constant.VerifyStatus;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

// 중개인 회원 1명의 자격 정보. Member와 1:1이며, Member의 PK를 그대로 공유한다(공유 기본키).
// 일반 사용자는 이 행 자체가 존재하지 않는다.
@Getter
@Setter
@ToString
@Entity
@Table(name = "brokers")
public class Broker {


    @Id
    @Column(name = "member_id")
    private Long id ; // Member의 PK를 그대로 사용

    // @MapsId : 연관관계 상대(Member)의 PK 값을 그대로 이 엔티티의 PK로 쓰겠다는 뜻.
    // 별도의 auto-increment 없이 Member 1명당 Broker가 0개 또는 1개만 존재하도록 강제된다.
    @OneToOne(fetch = FetchType.LAZY)
    @MapsId
    @JoinColumn(name = "member_id")
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
    private VerifyStatus verifyStatus = VerifyStatus.UNVERFIED ;
}
