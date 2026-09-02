package com.brentversal.agency.dto;

import com.brentversal.agency.entity.AgencyConsultation;
import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;

// 사용자가 보는 "내 상담" 목록의 1건
//
// 중개인이 보는 DTO(ConsultationResponseDto)와 담는 값이 다르다.
// 중개인은 "누가 보냈는지(이름·연락처)"가 필요하고,
// 사용자는 "어느 사무소에 보냈고 답변이 왔는지"가 필요하다.
@Getter @Setter
public class MyConsultationDto {
    private Long id ;

    // 상담을 보낸 중개사무소
    private Long agencyId ;
    private String agencyName ;
    private String brokerName ;   // 대표 공인중개사
    private String agencyPhone ;  // 답변을 받은 뒤 직접 연락할 때 쓴다

    private Long propertyId ;     // 문의한 매물 (고르지 않았으면 null)

    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate preferredDate ; // 상담 희망일

    private String content ;      // 내가 보낸 문의 내용

    private String status ;       // REQUESTED / ACCEPTED / DONE / CLOSED
    private String statusLabel ;  // 상담 요청 / 상담 확정 / 상담 완료 / 종료

    // ── 중개인이 보낸 답변 ───────────────────────────────
    private String reply ;        // 답변 내용 (아직 없으면 null)
    private boolean replyChecked ; // 내가 이 답변을 확인했는지 (알림 표시 기준)

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm")
    private LocalDateTime repliedAt ; // 답변이 온 시각

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm")
    private LocalDateTime createdAt ; // 내가 요청을 보낸 시각

    public static MyConsultationDto of(AgencyConsultation bean){
        MyConsultationDto dto = new MyConsultationDto();

        dto.setId(bean.getId());
        dto.setPropertyId(bean.getProperty() != null ? bean.getProperty().getId() : null);
        dto.setPreferredDate(bean.getPreferredDate());
        dto.setContent(bean.getContent());
        dto.setReply(bean.getReply());
        dto.setRepliedAt(bean.getRepliedAt());
        dto.setReplyChecked(bean.getReplyCheckedAt() != null);
        dto.setCreatedAt(bean.getCreatedAt());

        if(bean.getStatus() != null){
            dto.setStatus(bean.getStatus().name());
            dto.setStatusLabel(bean.getStatus().getLabel());
        }

        // 사무소는 지연 로딩이라, 트랜잭션 안에서 변환해야 값이 채워진다
        if(bean.getAgency() != null){
            dto.setAgencyId(bean.getAgency().getId());
            dto.setAgencyName(bean.getAgency().getName());
            dto.setBrokerName(bean.getAgency().getBrokerName());
            dto.setAgencyPhone(bean.getAgency().getPhone());
        }

        return dto;
    }
}
