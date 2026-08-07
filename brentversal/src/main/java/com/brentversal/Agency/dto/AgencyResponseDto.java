package com.brentversal.Agency.dto;

import com.brentversal.Agency.entity.Agency;
import lombok.Getter;
import lombok.Setter;

// dto(Data Transfer Object)
// 중개사무소 정보를 클라이언트(React)로 내보내기 위한 자바 클래스
// 엔터티를 그대로 내보내면 회원(member) 정보까지 딸려 나가고,
// 지연 로딩 때문에 JSON 변환 중 오류가 날 수 있어서 필요한 값만 담아 보낸다.
@Getter @Setter
public class AgencyResponseDto {
    private Long id ;
    private String name ;         // 중개사무소 이름
    private String brokerName ;   // 공인중개사 이름
    private String address ;      // 사무소 주소
    private String phone ;        // 사무소 전화번호
    private String hours ;        // 영업시간
    private Double latitude ;     // 위도 (지도 마커용)
    private Double longitude ;    // 경도 (지도 마커용)
    private boolean verified ;    // 관리자 인증 완료 여부
    private Double ratingAvg ;    // 이용자 평점 평균
    private String status ;       // 상담 상태 코드 (AVAILABLE / RESERVED / CLOSED)
    private String statusLabel ;  // 상담 상태 한글 라벨 (상담 가능 / 예약 상담 / 상담 불가)
    private Integer listingCount ;// 등록 매물 건수

    // 엔터티 -> DTO 변환 메소드
    // 서비스에서 agencyList.stream().map(AgencyResponseDto::of) 형태로 사용한다.
    public static AgencyResponseDto of(Agency bean){
        AgencyResponseDto dto = new AgencyResponseDto();

        dto.setId(bean.getId());
        dto.setName(bean.getName());
        dto.setBrokerName(bean.getBrokerName());
        dto.setAddress(bean.getAddress());
        dto.setPhone(bean.getPhone());
        dto.setHours(bean.getHours());
        dto.setLatitude(bean.getLatitude());
        dto.setLongitude(bean.getLongitude());
        dto.setVerified(bean.isVerified());
        dto.setRatingAvg(bean.getRatingAvg());
        dto.setListingCount(bean.getListingCount());

        // status 가 null 인 옛 데이터가 있을 수 있으므로 방어적으로 확인한다
        if(bean.getStatus() != null){
            dto.setStatus(bean.getStatus().name());
            dto.setStatusLabel(bean.getStatus().getLabel());
        }

        return dto;
    }
}
