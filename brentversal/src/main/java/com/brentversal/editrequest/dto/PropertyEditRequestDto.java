package com.brentversal.editrequest.dto;

import com.brentversal.agency.entity.Agency;
import com.brentversal.editrequest.constant.EditRequestStatus;
import com.brentversal.editrequest.entity.PropertyEditRequest;
import com.brentversal.member.entity.Member;
import com.brentversal.property.entity.Property;
import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

// 매물 수정 요청 한 건을 화면에 보여 줄 형태로 옮긴 것
//
// 관리자 화면(요청 이력)과 중개인 화면(받은 요청)이 같은 내용을 보므로 DTO 를 하나만 쓴다.
@Getter @Setter
public class PropertyEditRequestDto {
    private Long id;

    private Long propertyId;
    private String propertyName;

    private Long agencyId;
    private String agencyName;

    private String requesterName; // 요청을 보낸 관리자 이름

    private String reason;

    private EditRequestStatus status;
    private String statusLabel;   // "처리 대기" / "처리 완료"

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm")
    private LocalDateTime createdAt;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm")
    private LocalDateTime resolvedAt;

    public static PropertyEditRequestDto of(PropertyEditRequest bean) {
        PropertyEditRequestDto dto = new PropertyEditRequestDto();

        dto.setId(bean.getId());
        dto.setReason(bean.getReason());
        dto.setStatus(bean.getStatus());
        dto.setStatusLabel(bean.getStatus() == null ? "" : bean.getStatus().getLabel());
        dto.setCreatedAt(bean.getCreatedAt());
        dto.setResolvedAt(bean.getResolvedAt());

        Property property = bean.getProperty();

        if (property != null) {
            dto.setPropertyId(property.getId());
            dto.setPropertyName(property.getName());

            Agency agency = property.getAgency();

            if (agency != null) {
                dto.setAgencyId(agency.getId());
                dto.setAgencyName(agency.getName());
            }
        }

        Member requester = bean.getRequester();

        if (requester != null) {
            dto.setRequesterName(requester.getName());
        }

        return dto;
    }
}
