package com.brentversal.agency.dto;

import com.brentversal.agency.entity.AgencyConsultation;
import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;

// 중개인이 보는 상담 요청 1건
//
// 중개인은 요청자에게 직접 전화나 문자를 해야 하므로 이름·연락처·이메일을 함께 내려 준다.
// (이 정보는 사용자가 상담 요청 시 "내 정보 제공"에 동의했기 때문에 전달할 수 있다)
// 중개인 본인만 조회할 수 있는 API 에서만 사용한다.
@Getter @Setter
public class ConsultationResponseDto {
    private Long id ;

    // 요청한 사람
    private String memberName ;
    private String memberPhone ;
    private String memberEmail ;

    // 요청 내용
    private Long propertyId ;   // 선택한 매물 (없으면 null)
    private String content ;    // 문의 내용

    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate preferredDate ; // 상담 희망일

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm")
    private LocalDateTime createdAt ; // 요청이 들어온 시각

    // 진행 상태
    private String status ;      // WAITING / ANSWERED / CLOSED
    private String statusLabel ; // 답변 대기 / 답변 완료 / 종료

    // 중개인이 보낸 답변
    private String reply ;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm")
    private LocalDateTime repliedAt ;

    public static ConsultationResponseDto of(AgencyConsultation bean){
        ConsultationResponseDto dto = new ConsultationResponseDto();

        dto.setId(bean.getId());
        dto.setPropertyId(bean.getProperty() != null ? bean.getProperty().getId() : null);
        dto.setContent(bean.getContent());
        dto.setPreferredDate(bean.getPreferredDate());
        dto.setCreatedAt(bean.getCreatedAt());
        dto.setReply(bean.getReply());
        dto.setRepliedAt(bean.getRepliedAt());

        if(bean.getStatus() != null){
            dto.setStatus(bean.getStatus().name());
            dto.setStatusLabel(bean.getStatus().getLabel());
        }

        // 회원 정보는 지연 로딩이라 이 시점(트랜잭션 안)에서 꺼내 담아야 한다.
        if(bean.getMember() != null){
            dto.setMemberName(bean.getMember().getName());
            dto.setMemberPhone(bean.getMember().getPhone());
            dto.setMemberEmail(bean.getMember().getEmail());
        } else {
            dto.setMemberName("탈퇴한 회원");
        }

        return dto;
    }
}
