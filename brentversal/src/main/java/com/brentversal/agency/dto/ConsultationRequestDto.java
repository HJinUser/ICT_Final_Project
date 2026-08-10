package com.brentversal.agency.dto;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

// 클라이언트가 보낸 상담 요청 내용을 담기 위한 DTO
@Getter @Setter
public class ConsultationRequestDto {
    private Long propertyId ;        // 상담을 원하는 매물 (선택하지 않으면 null)
    private LocalDate preferredDate ;// 상담 희망일
    private String content ;         // 문의 내용
    private boolean agreed ;         // 내 정보 제공 동의 여부 (동의해야만 요청이 저장된다)
}
