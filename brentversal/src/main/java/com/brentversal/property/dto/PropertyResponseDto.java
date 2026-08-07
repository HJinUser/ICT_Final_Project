package com.brentversal.property.dto;

import com.brentversal.property.entity.Property;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter @Setter
public class PropertyResponseDto {
    private Long id;

    private Long agencyId;       // agency 객체 전체 대신 id만
    private Long neighborhoodId; // neighborhood 객체 전체 대신 id만

    private String name;      // 매물명
    private String type;      // PropertyType enum 이름 (예: APARTMENT)
    private String dealType;  // DealType enum 이름 (예: JEONSE)
    private String address;   // 주소

    private BigDecimal area;      // 전용면적(㎡)
    private Integer floor;        // 층수
    private Integer roomCount;    // 방 개수
    private Integer bathroomCount; // 욕실 개수

    // 거래유형에 따라 쓰이는 필드가 다름 (validatePricingFields와 동일한 규칙)
    private Long price;          // 매매가(만원)
    private Long deposit;        // 전세가(만원)
    private Long monthlyDeposit; // 월세 보증금(만원)
    private Long monthlyRent;    // 월세 금액(만원)
    private Integer maintenanceFee; // 관리비(만원)

    private String status;   // PropertyStatus enum 이름
    private Boolean visible; // 공개/비공개 여부
    private Long aiPrice;    // AI 예상 시세

    private LocalDateTime createdAt; // 등록일시

    // 엔터티 -> dto 변환 메소드
    public static PropertyResponseDto of (Property bean) {
        PropertyResponseDto dto = new PropertyResponseDto();

        dto.setId(bean.getId());

        if (bean.getAgency() != null) {
            dto.setAgencyId(bean.getAgency().getId());
        }
        dto.setNeighborhoodId(bean.getNeighborhoodId());

        dto.setName(bean.getName());

        if (bean.getType() != null) {
            dto.setType(bean.getType().name());
        }
        if (bean.getDealType() != null) {
            dto.setDealType(bean.getDealType().name());
        }

        dto.setAddress(bean.getAddress());
        dto.setArea(bean.getArea());
        dto.setFloor(bean.getFloor());
        dto.setRoomCount(bean.getRoomCount());
        dto.setBathroomCount(bean.getBathroomCount());

        dto.setPrice(bean.getPrice());
        dto.setDeposit(bean.getDeposit());
        dto.setMonthlyDeposit(bean.getMonthlyDeposit());
        dto.setMonthlyRent(bean.getMonthlyRent());
        dto.setMaintenanceFee(bean.getMaintenanceFee());

        if (bean.getStatus() != null) {
            dto.setStatus(bean.getStatus().name());
        }
        dto.setVisible(bean.getVisible());
        dto.setAiPrice(bean.getAiPrice());
        dto.setCreatedAt(bean.getCreatedAt());

        return dto;
    }
}
