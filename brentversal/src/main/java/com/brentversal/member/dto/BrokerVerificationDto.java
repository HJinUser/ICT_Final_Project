package com.brentversal.member.dto;

import com.brentversal.member.entity.Broker;
import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;

// 중개사무소(중개인) 인증 신청 화면에서 주고받는 DTO
//
// 신청할 때  : 프론트가 등록번호·상호·소재지·대표자·등록일을 담아 보낸다. (자격증 사진은 파일로 따로 보낸다)
// 조회할 때  : 서버가 위 값에 더해 현재 심사 상태(verifyStatus)와 반려 사유까지 담아 돌려준다.
@Getter @Setter
public class BrokerVerificationDto {
    private String licenseNumber ;  // 등록번호 (xxxxx-xxxx-xxxxx)
    private String businessName ;   // 상호
    private String officeAddress ;  // 소재지

    // 주소 검색이 함께 돌려주는 지역 조각. 승인 시 중개사무소에 그대로 옮겨 담는다.
    private String officeSigungu ;
    private String officeDong ;
    private String ownerName ;      // 대표자

    // 프론트의 <input type="date"> 값("2024-05-20")을 그대로 주고받기 위한 형식 지정
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate registeredDate ; // 등록일

    // ↓ 아래 값들은 서버가 채워서 내려 주기만 하는 값이다 (신청할 때는 보내지 않는다)
    private String licenseImageUrl ; // 업로드한 자격증 사진 주소
    private String verifyStatus ;    // UNVERIFIED / PENDING / VERIFIED
    private String verifyStatusLabel;// 화면에 보여 줄 한글 상태
    private String rejectReason ;    // 반려 사유 (없으면 null)

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm")
    private LocalDateTime submittedAt ; // 신청 시각

    // 상태 코드 -> 화면에 보여 줄 한글 문구
    // 열거형(VerifyStatus)에 라벨을 넣지 않고 여기서 바꾸는 이유는,
    // VerifyStatus 가 다른 팀원이 만든 파일이라 건드리지 않기 위해서다.
    private static String toLabel(String status){
        return switch (status) {
            case "PENDING" -> "심사 중";
            case "VERIFIED" -> "인증 완료";
            default -> "미인증";
        };
    }

    // 엔터티 -> DTO 변환
    public static BrokerVerificationDto of(Broker bean){
        BrokerVerificationDto dto = new BrokerVerificationDto();

        dto.setLicenseNumber(bean.getLicenseNumber());
        dto.setBusinessName(bean.getBusinessName());
        dto.setOfficeAddress(bean.getOfficeAddress());
        dto.setOwnerName(bean.getOwnerName());
        dto.setRegisteredDate(bean.getRegisteredDate());
        dto.setLicenseImageUrl(bean.getLicenseImageUrl());
        dto.setRejectReason(bean.getRejectReason());
        dto.setSubmittedAt(bean.getSubmittedAt());

        if(bean.getVerifyStatus() != null){
            dto.setVerifyStatus(bean.getVerifyStatus().name());
            dto.setVerifyStatusLabel(toLabel(bean.getVerifyStatus().name()));
        }

        return dto;
    }
}
