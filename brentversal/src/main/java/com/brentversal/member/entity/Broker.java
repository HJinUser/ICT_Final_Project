package com.brentversal.member.entity;

import com.brentversal.member.constant.LicenseType;
import com.brentversal.member.constant.VerifyStatus;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

import java.time.LocalDate;
import java.time.LocalDateTime;

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

    // ── 중개사무소 인증 신청 정보 ─────────────────────────────────
    // 중개인이 마이페이지 > "내 중개사무소 인증 받기" 화면에서 입력하는 값들이다.
    // 관리자는 이 값과 자격증 사진을 디지털트윈국토에서 조회한 실제 정보와 대조해 승인한다.
    // 신청 전에는 모두 비어 있으므로 nullable 로 둔다.

    @Column(name = "business_name", length = 100)
    private String businessName ; // 상호 (사무소 이름)

    @Column(name = "office_address", length = 200)
    private String officeAddress ; // 소재지 (사무소 주소)

    @Column(name = "owner_name", length = 50)
    private String ownerName ; // 대표자 이름

    @Column(name = "registered_date")
    private LocalDate registeredDate ; // 개설 등록일

    // 자격증 사진의 접근 URL. 실제 파일은 FileService 가 저장하고 주소만 여기에 남긴다.
    @Column(name = "license_image_url", length = 500)
    private String licenseImageUrl ;

    @Column(name = "submitted_at")
    private LocalDateTime submittedAt ; // 인증을 신청한 시각 (신청 전에는 null)

    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt ; // 관리자가 심사를 끝낸 시각

    // 관리자가 반려한 이유. 중개인 화면에 그대로 보여 준다.
    @Column(name = "reject_reason", length = 500)
    private String rejectReason ;
}
