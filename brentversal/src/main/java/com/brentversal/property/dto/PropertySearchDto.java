package com.brentversal.property.dto;

import com.brentversal.agency.dto.AgencyPropertyDto;
import com.brentversal.property.entity.Property;
import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

// 지도 검색 화면의 매물 1건
//
// 같은 자료를 지도 핀과 오른쪽 목록이 함께 쓴다.
//   핀   : latitude/longitude 와 가격 문구
//   목록 : 가격·동네·면적·층수·거래 상태
//
// 매물 상세(PropertyResponseDto)보다 가벼운 값만 담는다.
// 목록에 수십 건이 한 번에 내려가므로 사진·태그·상세 설명까지 실을 이유가 없다.
@Getter @Setter
public class PropertySearchDto {
    private Long id ;
    private String name ;
    private String dealType ;   // SALE / JEONSE / MONTHLY
    private String priceLabel ; // "전세 4억 9,000"
    private Long price ;        // 정렬·핀 문구에 쓰는 대표 금액 (만원)
    @JsonIgnore
    private Long comparablePrice;
    private String address ;
    private String gu ;         // 주소에서 뽑은 구·시·군 (지도를 많이 축소했을 때 묶는 기준)
    private String dong ;       // 주소에서 뽑은 동네 이름 (조금 축소했을 때 묶는 기준)
    private BigDecimal area ;   // 전용면적 (숫자 — 필터·정렬용)
    private String areaLabel ;  // "84㎡"
    private Integer floor ;
    private Integer roomCount ;

    // 지도 핀 좌표. 아직 좌표를 못 채운 매물은 null 이고, 그런 매물은 핀이 찍히지 않는다.
    private Double latitude ;
    private Double longitude ;

    private String status ;      // 거래 상태 코드
    private String statusLabel ; // 게시중 / 거래 진행중 ...

    // 이 매물을 올린 중개사무소. 중개인 화면에서 "내 매물"을 구분하는 데 쓴다.
    private Long agencyId ;
    private String agencyName ;

    // 대표 사진 주소. 없으면 null 이고 화면은 빈 자리를 보여 준다.
    private String thumbnailUrl ;

    // 매물 유형 (원/투룸·아파트 …). 필터가 고른 값과 같은 코드다.
    private String type ;
    private String typeLabel ;

    // ── 시세 평가 ────────────────────────────────────────
    private String priceEvaluation;

    // 카드에 붙는 핵심 키워드 (태그 이름 몇 개)
    private List<String> keywords = new ArrayList<>();

    // 카드에 몇 개까지 키워드를 보여 줄지
    private static final int KEYWORD_LIMIT = 3 ;

    public static PropertySearchDto of(Property bean){
        PropertySearchDto dto = new PropertySearchDto();

        dto.setId(bean.getId());
        dto.setName(bean.getName());
        dto.setAddress(bean.getAddress());
        dto.setArea(bean.getArea());
        dto.setFloor(bean.getFloor());
        dto.setRoomCount(bean.getRoomCount());
        dto.setLatitude(bean.getLatitude());
        dto.setLongitude(bean.getLongitude());

        // 가격 문구·동네·면적 라벨은 중개사무소 카드와 같은 규칙이라 그 변환 결과를 그대로 쓴다
        AgencyPropertyDto card = AgencyPropertyDto.of(bean);
        dto.setDealType(card.getDealType());
        dto.setPriceLabel(card.getPriceLabel());
        // 동네·구는 지도에서 묶는 기준이다.
        //
        // 주소를 검색해서 고른 매물은 구·동이 컬럼에 저장되어 있으므로 그 값을 그대로 쓴다.
        // 도로명 주소("서울시 영등포구 당산로 222")에는 동이 없어서, 컬럼이 없으면 알 방법이 없다.
        //
        // 컬럼이 비어 있는 것은 주소 검색을 붙이기 전에 등록된 자료다.
        // 그런 자료는 대개 지번 주소라서 주소 문자열에서 뽑을 수 있어, 예전 방식으로 한 번 더 시도한다.
        dto.setGu(bean.getSigungu() != null ? bean.getSigungu() : toGu(bean.getAddress()));
        dto.setDong(bean.getDong() != null ? bean.getDong() : toDong(bean.getAddress()));
        dto.setAreaLabel(card.getArea());
        dto.setStatus(card.getStatus());
        dto.setStatusLabel(card.getStatusLabel());

        dto.setPrice(primaryPrice(bean));
        dto.setComparablePrice(comparablePrice(bean));

        if(bean.getType() != null){
            dto.setType(bean.getType().name());
            dto.setTypeLabel(toTypeLabel(bean.getType().name()));
        }

        // 시세 평가 : 예상 시세가 있을 때만 비교한다
        // 현재 값/권한/상태가 조건을 만족하는지 확인함
        if (bean.getPriceEvaluation() != null) {
            // 지도검색 응답 DTO에 관리자 수동 가격평가 Enum 이름을 문자열로 복사함
            dto.setPriceEvaluation(bean.getPriceEvaluation().name());
        }

        // 핵심 키워드 (태그 이름 몇 개만)
        dto.setKeywords(bean.getTags().stream()
                .map(tag -> tag.getName())
                .limit(KEYWORD_LIMIT)
                .toList());

        if(bean.getAgency() != null){
            dto.setAgencyId(bean.getAgency().getId());
            dto.setAgencyName(bean.getAgency().getName());
        }

        // 대표 사진(isMain)이 있으면 그것을, 없으면 첫 장을 쓴다
        bean.getImages().stream()
                .filter(image -> Boolean.TRUE.equals(image.getIsMain()))
                .findFirst()
                .or(() -> bean.getImages().stream().findFirst())
                .ifPresent(image -> dto.setThumbnailUrl(image.getUrl()));

        return dto;
    }

    // 주소에서 '구'(또는 시·군)로 끝나는 조각을 찾는다.
    // 예) "서울 서초구 반포동 30-1"          -> "서초구"
    //     "서울특별시 영등포구 당산로 222"   -> "영등포구"
    //     "성남시 분당구 ..."                -> "분당구"
    //
    // '구'를 먼저 모두 찾아본 뒤에 시·군을 본다.
    // 앞에서부터 '시'로 끝나는 조각을 먼저 잡으면 "서울특별시"가 걸려서 구를 놓친다.
    // 특별시·광역시는 지도에서 묶기에 너무 넓어 기준으로 쓰지 않는다.
    private static String toGu(String address){
        if(address == null) return null;

        String[] tokens = address.split(" ");

        for(String token : tokens){
            if(token.endsWith("구")) return token;
        }

        for(String token : tokens){
            if(token.endsWith("특별시") || token.endsWith("광역시")) continue;
            if(token.endsWith("시") || token.endsWith("군")) return token;
        }

        return null;
    }

    // 주소에서 동네에 해당하는 조각을 찾는다. (동·가·읍·면)
    // 못 찾으면 null 을 준다. 주소 전체를 대신 넣으면 지도에서 그 주소 하나가
    // 동네 하나처럼 묶여 버리기 때문이다.
    private static String toDong(String address){
        if(address == null) return null;

        for(String token : address.split(" ")){
            if(token.endsWith("동") || token.endsWith("가") || token.endsWith("읍") || token.endsWith("면")) {
                return token;
            }
        }

        return null;
    }

    // 매물 유형의 한글 이름. 중개인 화면(MyPropertyCardDto)과 같은 규칙이다.
    private static String toTypeLabel(String type){
        return switch (type) {
            case "ONE_TWO_ROOM" -> "원/투룸";
            case "APARTMENT" -> "아파트";
            case "VILLA" -> "주택/빌라";
            case "OFFICETEL" -> "오피스텔";
            default -> type;
        };
    }

    // 거래 유형마다 쓰는 금액 칸이 달라서, 비교할 수 있는 대표 금액 하나를 뽑는다.
    // (매매=매매가, 전세=전세가, 월세=보증금)
    private static Long primaryPrice(Property bean){
        if(bean.getDealType() == null) return null;

        return switch (bean.getDealType()) {
            case SALE -> bean.getPrice();
            case JEONSE -> bean.getDeposit();
            case MONTHLY -> bean.getMonthlyDeposit();
        };
    }

    private static Long comparablePrice(Property bean){
        if (bean.getDealType() == null) return null;

        return switch (bean.getDealType()){
            case SALE -> bean.getPrice();
            case JEONSE -> bean.getDeposit();
            case MONTHLY -> {
                if (bean.getMonthlyDeposit() == null && bean.getMonthlyRent() == null) yield null;
                long deposit = bean.getMonthlyDeposit() == null ? 0L : bean.getMonthlyDeposit();
                long rent = bean.getMonthlyRent() == null ? 0L : bean.getMonthlyRent();
                yield deposit + (rent * 100);
            }
        };
    }
}
