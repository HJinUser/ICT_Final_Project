package com.brentversal.agency.dto;

import com.brentversal.agency.entity.Agency;
import lombok.Getter;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

// 중개사무소 상세 페이지 한 화면에 필요한 값을 모두 담는 DTO
// 목록용(AgencyResponseDto)과 달리 등록번호·이미지·담당 매물·후기 수까지 함께 내려 준다.
// 화면이 필요한 데이터를 한 번의 요청으로 받도록 묶어 둔 것이다.
@Getter @Setter
public class AgencyDetailDto {
    // 기본 정보
    private Long id ;
    private String name ;
    private String brokerName ;
    private String address ;
    private String phone ;
    private String hours ;
    private String registrationNo ; // 등록번호
    private Double latitude ;
    private Double longitude ;
    private boolean verified ;
    private Double ratingAvg ;
    private String status ;
    private String statusLabel ;

    // 사무소 대표 이미지 (갤러리용, 순서대로)
    private List<String> imageUrls = new ArrayList<>();

    // 담당 매물
    private long listingCount ;   // 전체 건수
    private long todayNewCount ;  // 오늘 새로 올라온 건수
    private List<AgencyPropertyDto> recentProperties = new ArrayList<>(); // 최근 등록 매물

    // 이용자 평가
    private long reviewCount ;

    // 엔터티만으로 채울 수 있는 값을 옮긴다.
    // 매물·후기 관련 값은 서비스에서 따로 채운다(다른 테이블을 조회해야 하기 때문).
    public static AgencyDetailDto of(Agency bean){
        AgencyDetailDto dto = new AgencyDetailDto();

        dto.setId(bean.getId());
        dto.setName(bean.getName());
        dto.setBrokerName(bean.getBrokerName());
        dto.setAddress(bean.getAddress());
        dto.setPhone(bean.getPhone());
        dto.setHours(bean.getHours());
        dto.setRegistrationNo(bean.getRegistrationNo());
        dto.setLatitude(bean.getLatitude());
        dto.setLongitude(bean.getLongitude());
        dto.setVerified(bean.isVerified());
        dto.setRatingAvg(bean.getRatingAvg());
        dto.setImageUrls(new ArrayList<>(bean.getImageUrls()));

        if(bean.getStatus() != null){
            dto.setStatus(bean.getStatus().name());
            dto.setStatusLabel(bean.getStatus().getLabel());
        }

        return dto;
    }
}
