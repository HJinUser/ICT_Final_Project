package com.brentversal.recommendation.dto;

import com.brentversal.property.constant.DealType;
import com.brentversal.property.constant.PropertyType;
import lombok.Getter;
import lombok.Setter;

// 지도 검색 화면이 검색을 실행할 때 함께 보내는 최근 검색 조건이다.
// 모든 항목이 선택 사항이며, 사용자가 걸지 않은 조건은 null 로 들어온다.
@Getter
@Setter
public class RecentSearchRequestDto {

    private String districtName;
    private DealType dealType;
    private PropertyType propertyType;
    private Long minPrice;
    private Long maxPrice;
}
