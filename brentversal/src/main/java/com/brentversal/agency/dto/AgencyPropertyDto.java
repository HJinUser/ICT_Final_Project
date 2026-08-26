package com.brentversal.agency.dto;

import com.brentversal.property.constant.DealType;
import com.brentversal.property.entity.Property;
import lombok.Getter;
import lombok.Setter;

// 중개사무소 상세 페이지의 "담당 매물" 카드 1건을 담는 DTO
// 매물 상세 화면이 아니라 요약 카드용이라 필요한 값만 담는다.
@Getter @Setter
public class AgencyPropertyDto {
    private Long id ;
    private String name ;       // 매물명
    private String dealType ;   // 거래 유형 코드 (SALE / JEONSE / MONTHLY)
    private String priceLabel ; // "전세 4억 9,000" 처럼 화면에 그대로 쓸 가격 문구
    private String dong ;       // 동네 (주소에서 '동'으로 끝나는 부분)
    private String area ;       // 전용면적 (예: "84㎡")

    // 거래 상태. 지금 담당 매물 조회는 게시중(ACTIVE)만 가져오지만,
    // 화면 배지를 "확인 매물"로 고정해 두면 나중에 조회 조건이 넓어졌을 때
    // 실제 상태와 다른 문구가 조용히 표시된다. 그래서 상태를 함께 내려 준다.
    private String status ;      // 거래 상태 코드 (ACTIVE 등)
    private String statusLabel ; // 화면에 그대로 쓸 한글 상태

    private String thumbnailUrl ; // 대표 사진. 없으면 null (화면은 빈 자리를 보여 준다)

    public static AgencyPropertyDto of(Property bean){
        AgencyPropertyDto dto = new AgencyPropertyDto();

        dto.setId(bean.getId());
        dto.setName(bean.getName());
        dto.setDealType(bean.getDealType() == null ? null : bean.getDealType().name());
        dto.setPriceLabel(toPriceLabel(bean));
        dto.setDong(toDong(bean.getAddress()));

        // 대표 사진(isMain)이 있으면 그것을, 없으면 첫 장을 쓴다.
        // 지도 검색 카드(PropertySearchDto), 내 중개사무소 카드(MyPropertyCardDto)와 같은 규칙이다.
        bean.getImages().stream()
                .filter(image -> Boolean.TRUE.equals(image.getIsMain()))
                .findFirst()
                .or(() -> bean.getImages().stream().findFirst())
                .ifPresent(image -> dto.setThumbnailUrl(image.getUrl()));

        if(bean.getStatus() != null){
            dto.setStatus(bean.getStatus().name());
            dto.setStatusLabel(toStatusLabel(bean.getStatus().name()));
        }

        if(bean.getArea() != null){
            // 84.00 처럼 소수점이 붙지 않도록 정수로 끊어서 표시한다
            dto.setArea(bean.getArea().intValue() + "㎡");
        }

        return dto;
    }

    // 거래 상태의 한글 이름.
    // 열거형(PropertyStatus)은 다른 팀원이 만든 파일이라 건드리지 않고 여기서 바꾼다.
    static String toStatusLabel(String status){
        return switch (status) {
            case "PENDING" -> "승인 대기";
            case "ACTIVE" -> "게시중";
            case "IN_PROGRESS" -> "거래 진행중";
            case "COMPLETED" -> "거래 완료";
            case "CANCELLED" -> "등록 취소";
            default -> status;
        };
    }

    // 거래 유형에 따라 쓰는 금액 필드가 달라서 화면 문구도 여기서 만든다.
    // 금액은 모두 만원 단위로 저장돼 있다.
    private static String toPriceLabel(Property bean){
        DealType dealType = bean.getDealType();

        if(dealType == null) return "";

        return switch (dealType) {
            case SALE -> "매매 " + toMoney(bean.getPrice());
            case JEONSE -> "전세 " + toMoney(bean.getDeposit());
            // 월세는 "월세 1,000/60" 처럼 보증금/월세를 함께 표시한다
            case MONTHLY -> "월세 " + toMoney(bean.getMonthlyDeposit())
                    + "/" + (bean.getMonthlyRent() == null ? "" : String.format("%,d", bean.getMonthlyRent()));
        };
    }

    // 만원 단위 숫자를 "4억 9,000" 형태로 바꾼다.
    private static String toMoney(Long manwon){
        if(manwon == null) return "";

        long eok = manwon / 10000;      // 억 단위
        long rest = manwon % 10000;     // 나머지 만원 단위

        if(eok > 0 && rest > 0) return eok + "억 " + String.format("%,d", rest) + "만 원";
        if(eok > 0) return eok + "억";

        return String.format("%,d", rest) + "만 원";
    }

    // 주소에서 '동'으로 끝나는 조각을 찾아 동네 이름으로 쓴다. (예: "서울 서초구 반포동 12" -> "반포동")
    // 못 찾으면 주소를 그대로 보여 준다.
    private static String toDong(String address){
        if(address == null) return "";

        for(String token : address.split(" ")){
            if(token.endsWith("동")) return token;
        }

        return address;
    }
}
