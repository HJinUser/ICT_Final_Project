package com.brentversal.recommendation.dto;

import com.brentversal.property.constant.DealType;
import com.brentversal.property.constant.PropertyType;
import lombok.Getter;
import lombok.Setter;

import java.util.HashSet;
import java.util.Set;

// 취향 초기설정 화면과 맞춤 추천 화면의 왼쪽 사이드바가 보내는 취향 저장 요청이다.
//
// 값을 고르지 않은 항목은 null 로 들어오고, 점수를 계산할 때 그 항목은 건너뛴다.
// 조건을 걸러내는 필터가 아니라 점수를 매기는 기준이라, 조건에 안 맞는 매물도 후보에는 남는다.
@Getter
@Setter
public class PreferenceRequestDto {

    private DealType dealType;
    private Set<PropertyType> propertyTypes = new HashSet<>();
    private Set<String> preferredDistricts = new HashSet<>();

    private Double minArea;
    private Double maxArea;
    private Integer minRoomCount;

    private Long saleMinPrice;
    private Long saleMaxPrice;
    private Long jeonseMinDeposit;
    private Long jeonseMaxDeposit;
    private Long monthlyMinDeposit;
    private Long monthlyMaxDeposit;
    private Long monthlyMinRent;
    private Long monthlyMaxRent;

    private boolean newBuildPreferred;
    private boolean stationPreferred;
    private boolean educationPreferred;
    private boolean parkPreferred;
    private boolean hospitalPreferred;
    private boolean conveniencePreferred;
    private boolean busPreferred;
    private boolean lowMaintenancePreferred;

    // 선호 태그는 tags 테이블의 id 로 받는다. 매물에 붙은 태그와 같은 id 라서 그대로 비교할 수 있다.
    private Set<Long> tagIds = new HashSet<>();
}
