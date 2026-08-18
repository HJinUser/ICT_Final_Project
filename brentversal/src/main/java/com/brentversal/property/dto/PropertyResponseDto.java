package com.brentversal.property.dto;

import com.brentversal.property.entity.Property;
import com.brentversal.property_image.dto.PropertyImageResponseDto;
import com.brentversal.tag.dto.TagResponseDto;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

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

    // 건축 연도. 맞춤 추천의 신축 판단과 매물 상세 표시에 쓴다.
    // 이 값이 생기기 전에 등록한 매물은 비어 있다.
    private Integer buildYear;

    private Double latitude;   // 매물 위도
    private Double longitude;  // 매물 경도

    // 거래유형에 따라 쓰이는 필드가 다름 (validatePricingFields와 동일한 규칙)
    private Long price;          // 매매가(만원)
    private Long deposit;        // 전세가(만원)
    private Long monthlyDeposit; // 월세 보증금(만원)
    private Long monthlyRent;    // 월세 금액(만원)
    private Integer maintenanceFee; // 관리비(만원)

    private Long aiPrice;
    private Long aiDeposit;
    private Long aiMonthlyDeposit;
    private Long aiMonthlyRent;
    private Double aiRecommendScore;

    private String description;      // 소개 글
    private String detailDescription; // 상세 설명
    private String moveInDate;       // 입주 가능일
    private String contractStatus;   // 계약 가능 상태

    private List<PropertyImageResponseDto> images;
    private List<TagResponseDto> tags;

    private String status;   // PropertyStatus enum 이름
    private Boolean visible; // 공개/비공개 여부
    private Double stationDistance; // 최근접 역까지 유클리드 거리
    private String priceStatus; // "UP" / "DOWN" / null (수정 이력 없거나 변동 없음)

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
        dto.setBuildYear(bean.getBuildYear());

        dto.setLatitude(bean.getLatitude());
        dto.setLongitude(bean.getLongitude());

        dto.setPrice(bean.getPrice());
        dto.setDeposit(bean.getDeposit());
        dto.setMonthlyDeposit(bean.getMonthlyDeposit());
        dto.setMonthlyRent(bean.getMonthlyRent());
        dto.setMaintenanceFee(bean.getMaintenanceFee());

        dto.setAiPrice(bean.getAiPrice());
        dto.setAiDeposit(bean.getAiDeposit());
        dto.setAiMonthlyDeposit(bean.getAiMonthlyDeposit());
        dto.setAiMonthlyRent(bean.getAiMonthlyRent());
        dto.setAiRecommendScore(bean.getAiRecommendScore());

        dto.setImages(bean.getImages().stream()
                .map(PropertyImageResponseDto::of)
                .toList());

        dto.setTags(bean.getTags().stream()
                .map(TagResponseDto::of)
                .toList());

        dto.setDescription(bean.getDescription());
        dto.setDetailDescription(bean.getDetailDescription());
        dto.setMoveInDate(bean.getMoveInDate() != null ? bean.getMoveInDate().toString() : null);
        if (bean.getContractStatus() != null) {
            dto.setContractStatus(bean.getContractStatus().name());
        }

        if (bean.getStatus() != null) {
            dto.setStatus(bean.getStatus().name());
        }
        dto.setVisible(bean.getVisible());
        dto.setStationDistance(bean.getStationDistance());
        dto.setCreatedAt(bean.getCreatedAt());

        if (bean.getPriceStatus() != null) {
            dto.setPriceStatus(bean.getPriceStatus().name());
        }

        return dto;
    }
}
