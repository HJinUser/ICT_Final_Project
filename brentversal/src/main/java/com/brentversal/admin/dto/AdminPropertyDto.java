package com.brentversal.admin.dto;

import com.brentversal.agency.dto.MyPropertyCardDto;
import com.brentversal.property.constant.DealType;
import com.brentversal.property.entity.Property;
import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

// 관리자 "매물 관리" 화면의 매물 카드 1건
//
// 중개인 화면(MyPropertyCardDto)과 보여 주는 값이 거의 같지만,
// 관리자는 "어느 사무소가 올린 매물인지"를 알아야 승인 여부를 판단할 수 있어서 사무소 정보를 더 담는다.
//
// 유형·가격·상태의 한글 라벨은 MyPropertyCardDto 가 이미 만들어 두었으므로 그대로 가져다 쓴다.
// 같은 규칙을 두 군데에 적어 두면 한쪽만 고치는 실수가 생기기 때문이다.
@Getter @Setter
public class AdminPropertyDto {
    private Long id ;
    private String name ;        // 매물 이름
    private String typeLabel ;   // 매물 유형 한글
    private String priceLabel ;  // "전세 36,000만원" — 아래 AI 예상 시세와 단위를 맞추려고 억 대신 만원+콤마로 표시한다

    // 관리자 매물 DTO에 거래유형·AI 예측 시세·관리자 가격평가 값을 추가함
    private String dealType;

    private Long aiPrice;
    private Long aiDeposit;
    private Long aiMonthlyDeposit;
    private Long aiMonthlyRent;

    private String priceEvaluation;

    private String address ;     // 위치
    private String area ;        // 면적 "84㎡"
    private Integer floor ;      // 층수
    private String status ;      // 거래 상태 코드
    private String statusLabel ; // 거래 상태 한글

    // 관리자에게만 필요한 값 : 이 매물을 올린 중개사무소
    private Long agencyId ;
    private String agencyName ;     // 사무소 이름
    private String brokerName ;     // 대표 공인중개사
    private boolean agencyVerified ; // 사무소 인증 여부 (승인 판단에 참고)

    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDateTime createdAt ; // 등록 신청일

    public static AdminPropertyDto of(Property bean){
        AdminPropertyDto dto = new AdminPropertyDto();

        // 중개인 화면과 같은 라벨 규칙을 쓰기 위해 그쪽 변환 결과를 재사용한다
        MyPropertyCardDto card = MyPropertyCardDto.of(bean);

        dto.setId(card.getId());
        dto.setName(card.getName());
        dto.setTypeLabel(card.getTypeLabel());
        // 가격 문구는 다른 화면(priceLabel 공용 규칙)과 달리 억 단위로 끊지 않고
        // AI 적정 시세 카드와 같은 만원+콤마 단위로 맞춰서 관리자 화면 안에서 단위를 통일한다
        dto.setPriceLabel(toManwonPriceLabel(bean));

        // 현재 값/권한/상태가 조건을 만족하는지 확인함
        if (bean.getDealType() != null) {
            dto.setDealType(bean.getDealType().name());
        }

        dto.setAiPrice(bean.getAiPrice());
        dto.setAiDeposit(bean.getAiDeposit());
        dto.setAiMonthlyDeposit(bean.getAiMonthlyDeposit());
        dto.setAiMonthlyRent(bean.getAiMonthlyRent());

        // 현재 값/권한/상태가 조건을 만족하는지 확인함
        if (bean.getPriceEvaluation() != null) {
            // 관리자 수동 가격평가 Enum을 문자열로 DTO에 복사함
            dto.setPriceEvaluation(bean.getPriceEvaluation().name());
        }

        dto.setAddress(card.getAddress());
        dto.setArea(card.getArea());
        dto.setFloor(card.getFloor());
        dto.setStatus(card.getStatus());
        dto.setStatusLabel(card.getStatusLabel());
        dto.setCreatedAt(card.getCreatedAt());

        // 사무소는 지연 로딩이라, 트랜잭션 안에서 변환해야 값이 채워진다 (AdminPropertyService 가 그렇게 호출한다)
        if(bean.getAgency() != null){
            dto.setAgencyId(bean.getAgency().getId());
            dto.setAgencyName(bean.getAgency().getName());
            dto.setBrokerName(bean.getAgency().getBrokerName());
            dto.setAgencyVerified(bean.getAgency().isVerified());
        }

        return dto;
    }

    // 거래유형에 따라 만원 단위 가격 문구를 만든다.
    // 억 단위로 끊는 공용 규칙(AgencyPropertyDto.toMoney) 대신, 바로 아래 AI 적정 시세 카드와
    // 같은 "만원 + 콤마" 단위를 써서 관리자 화면 안에서 두 금액을 바로 비교할 수 있게 한다.
    private static String toManwonPriceLabel(Property bean){
        DealType dealType = bean.getDealType();

        if(dealType == null) return "";

        return switch (dealType) {
            case SALE -> "매매 " + toManwon(bean.getPrice());
            case JEONSE -> "전세 " + toManwon(bean.getDeposit());
            case MONTHLY -> "월세 " + toManwon(bean.getMonthlyDeposit())
                    + " / " + toManwon(bean.getMonthlyRent());
        };
    }

    private static String toManwon(Long manwon){
        if(manwon == null) return "";
        return String.format("%,d만원", manwon);
    }
}
