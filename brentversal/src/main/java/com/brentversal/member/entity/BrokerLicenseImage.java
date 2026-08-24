package com.brentversal.member.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

// 중개인이 제출한 자격증 사진 이력. 재신청할 때마다 새 행이 추가되고 기존 행은 지우지 않는다.
// 분쟁·민원 대응이나 반려 이력 확인을 위해 예전에 제출한 사진도 그대로 보관해 둔다.
// 실제 파일은 FileService(S3/로컬)에 그대로 남아 있고, 여기는 그 URL과 제출 시각만 기록한다.
@Getter @Setter @Entity
@Table(name = "broker_license_images")
public class BrokerLicenseImage {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    @Column(name = "broker_license_image_id")
    private Long id;

    // 이 사진을 제출한 중개인. Broker 쪽에는 별도 컬렉션을 두지 않고 broker_id로만 연결한다.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "broker_id", nullable = false)
    private Broker broker;

    @Column(name = "url", length = 500, nullable = false)
    private String url; // 사진 접근 URL (S3 또는 로컬)

    @Column(name = "submitted_at", nullable = false)
    private LocalDateTime submittedAt; // 이 사진을 제출(업로드)한 시각

    // 현재 broker.licenseImageUrl이 가리키는 "최신" 사진인지 표시.
    // 재신청할 때마다 이전 값은 false로 바뀌고 새로 올린 것만 true가 된다.
    @Column(name = "is_current", nullable = false)
    private Boolean isCurrent = false;
}