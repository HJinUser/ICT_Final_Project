package com.brentversal.property.dto;

import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.List;

// 지도 검색 화면의 왼쪽 필터에서 고른 조건
//
// 프론트가 쿼리 파라미터로 보내고(GET /property/search?region=서초구&dealType=JEONSE...),
// 스프링이 이 객체에 담아 준다. 고르지 않은 항목은 null 로 들어오고, 그 조건은 건너뛴다.
@Getter @Setter
public class PropertySearchCondition {
    private String region ;    // 지역 구 (주소에 포함되는 문자열, 예: "서초구")
    private String dong ;      // 동 (구를 고른 뒤 더 좁힐 때. 예: "반포동")
    private String type ;      // 매물 유형 ONE_TWO_ROOM / APARTMENT / VILLA / OFFICETEL. 하나만 고른다
    private String dealType ;  // SALE / JEONSE / MONTHLY. 안 고르면 전체
    private Long minPrice ;    // 만원 단위
    private Long maxPrice ;
    private BigDecimal minArea ; // ㎡
    private BigDecimal maxArea ;

    // 방 개수는 여러 개를 함께 고를 수 있다 ([1개] [2개] [3개 이상]).
    // 3개 이상은 3 으로 보내고, 서비스가 "3 이상"으로 바꿔 준다.
    private List<Integer> roomCounts ;

    // 특수 조건(태그). 고른 태그를 "모두" 가진 매물만 남긴다.
    // 예) 주차 가능 + 반려동물 을 고르면 둘 다 되는 매물만 나온다.
    private List<Long> tagIds ;

    // 중개인이 "내 매물"만 볼 때 true. 로그인한 사람의 사무소 매물만 걸러 준다.
    private boolean mine ;

    // 정렬 기준. 화면정의서 3-1의 오른쪽 사이드바 정렬 메뉴와 짝을 이룬다.
    //   LATEST(기본) / PRICE_ASC / PRICE_DESC / AREA_DESC / AREA_ASC
    private String sort ;
}
