package com.brentversal.agency.dto;

import com.brentversal.property.entity.Property;
import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

// "내 중개사무소" 화면의 등록 매물 카드 1건 (2행 3열로 배치)
//
// 중개사무소 상세의 담당 매물 카드(AgencyPropertyDto)보다 보여 주는 값이 많다.
// 중개인 본인 화면이라 승인 대기·비공개 상태까지 확인할 수 있어야 하기 때문이다.
@Getter @Setter
public class MyPropertyCardDto {
    private Long id ;
    private String name ;        // 매물 이름
    private String type ;        // 매물 유형 코드 (APARTMENT 등)
    private String typeLabel ;   // 매물 유형 한글
    private String dealType ;    // 거래 유형 코드
    private String priceLabel ;  // "전세 4억 9,000"
    private String address ;     // 위치
    private String area ;        // 면적 "84㎡"
    private Integer floor ;      // 층수
    private String status ;      // 거래 상태 코드
    private String statusLabel ; // 거래 상태 한글
    private boolean visible ;    // 공개 여부

    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDateTime createdAt ; // 등록일

    public static MyPropertyCardDto of(Property bean){
        MyPropertyCardDto dto = new MyPropertyCardDto();

        dto.setId(bean.getId());
        dto.setName(bean.getName());
        dto.setAddress(bean.getAddress());
        dto.setFloor(bean.getFloor());
        dto.setCreatedAt(bean.getCreatedAt());
        dto.setVisible(Boolean.TRUE.equals(bean.getVisible()));

        // 가격 문구는 중개사무소 상세 카드와 같은 규칙이라 그 DTO 의 변환 결과를 그대로 쓴다.
        AgencyPropertyDto price = AgencyPropertyDto.of(bean);
        dto.setPriceLabel(price.getPriceLabel());
        dto.setArea(price.getArea());
        dto.setDealType(price.getDealType());

        if(bean.getType() != null){
            dto.setType(bean.getType().name());
            dto.setTypeLabel(toTypeLabel(bean.getType().name()));
        }

        if(bean.getStatus() != null){
            dto.setStatus(bean.getStatus().name());
            dto.setStatusLabel(toStatusLabel(bean.getStatus().name()));
        }

        return dto;
    }

    // 매물 유형·상태의 한글 이름.
    // 열거형(PropertyType, PropertyStatus)은 다른 팀원이 만든 파일이라 건드리지 않고 여기서 바꾼다.
    private static String toTypeLabel(String type){
        return switch (type) {
            case "ONE_TWO_ROOM" -> "원/투룸";
            case "APARTMENT" -> "아파트";
            case "VILLA" -> "주택/빌라";
            case "OFFICETEL" -> "오피스텔";
            default -> type;
        };
    }

    private static String toStatusLabel(String status){
        return switch (status) {
            case "PENDING" -> "승인 대기";
            case "ACTIVE" -> "게시중";
            case "IN_PROGRESS" -> "거래 진행중";
            case "COMPLETED" -> "거래 완료";
            case "CANCELLED" -> "등록 취소";
            default -> status;
        };
    }
}
