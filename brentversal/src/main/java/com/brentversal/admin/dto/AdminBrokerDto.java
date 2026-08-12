package com.brentversal.admin.dto;

import com.brentversal.agency.entity.Agency;
import com.brentversal.member.dto.BrokerVerificationDto;
import com.brentversal.member.entity.Broker;
import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;

// 관리자 "중개인 인증" 화면의 신청 1건
//
// 중개인이 제출한 값(BrokerVerificationDto 와 같은 내용)에 더해,
// 관리자가 판단하는 데 필요한 "누가 신청했는지"와 "연결된 사무소"를 함께 담는다.
//
// 관리자는 이 값들과 자격증 사진을 디지털트윈국토에서 조회한 실제 정보와 대조해 승인한다.
@Getter @Setter
public class AdminBrokerDto {
    private Long id ;               // 중개인(broker) id — 승인·반려할 때 쓴다

    // 신청한 사람
    private String memberName ;
    private String memberEmail ;
    private String memberPhone ;

    // 중개인이 제출한 인증 정보
    private String licenseNumber ;  // 등록번호
    private String businessName ;   // 상호
    private String officeAddress ;  // 소재지
    private String ownerName ;      // 대표자
    private String licenseImageUrl ; // 자격증 사진 (관리자가 눈으로 대조한다)

    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate registeredDate ; // 개설 등록일

    // 심사 상태
    private String verifyStatus ;     // UNVERIFIED / PENDING / VERIFIED
    private String verifyStatusLabel ; // 미인증 / 심사 중 / 인증 완료
    private String rejectReason ;     // 반려 사유 (없으면 null)

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm")
    private LocalDateTime submittedAt ; // 신청 시각

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm")
    private LocalDateTime reviewedAt ;  // 심사를 끝낸 시각

    // 이 중개인의 중개사무소 (회원가입 때 함께 만들어진다)
    private Long agencyId ;
    private String agencyName ;
    private String agencyAddress ;
    private boolean agencyVerified ; // 사무소에 인증 마크가 붙었는지

    // agency 는 Broker 엔터티가 갖고 있지 않아서 서비스가 따로 찾아 넘겨 준다.
    // 없을 수도 있으므로(사무소가 아직 없는 중개인) null 을 허용한다.
    public static AdminBrokerDto of(Broker bean, Agency agency){
        AdminBrokerDto dto = new AdminBrokerDto();

        dto.setId(bean.getId());

        // 제출값과 상태 라벨은 중개인 화면과 같은 규칙을 쓰기 위해 그쪽 변환 결과를 재사용한다
        BrokerVerificationDto submitted = BrokerVerificationDto.of(bean);

        dto.setLicenseNumber(submitted.getLicenseNumber());
        dto.setBusinessName(submitted.getBusinessName());
        dto.setOfficeAddress(submitted.getOfficeAddress());
        dto.setOwnerName(submitted.getOwnerName());
        dto.setRegisteredDate(submitted.getRegisteredDate());
        dto.setLicenseImageUrl(submitted.getLicenseImageUrl());
        dto.setVerifyStatus(submitted.getVerifyStatus());
        dto.setVerifyStatusLabel(submitted.getVerifyStatusLabel());
        dto.setRejectReason(submitted.getRejectReason());
        dto.setSubmittedAt(submitted.getSubmittedAt());

        dto.setReviewedAt(bean.getReviewedAt());

        // 회원 정보는 지연 로딩이라, 트랜잭션 안에서 변환해야 값이 채워진다
        if(bean.getMember() != null){
            dto.setMemberName(bean.getMember().getName());
            dto.setMemberEmail(bean.getMember().getEmail());
            dto.setMemberPhone(bean.getMember().getPhone());
        }

        if(agency != null){
            dto.setAgencyId(agency.getId());
            dto.setAgencyName(agency.getName());
            dto.setAgencyAddress(agency.getAddress());
            dto.setAgencyVerified(agency.isVerified());
        }

        return dto;
    }
}
