package com.brentversal.recommendation.dto;

import lombok.Getter;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

// 추천 동네 한 건이다. 화면 아래쪽 "추천 동네 TOP 3" 카드에 대응된다.
//
// 최종적으로는 행정동 군집 분석 결과를 그대로 담는 자리다(adminCode, clusterName).
// 지금은 군집 분석이 아직 없어서 기존 동네 자료(법정동)로 점수를 매기고 있고,
// 그동안에는 adminCode 와 clusterName 이 비어 있으며 neighborhoodId 로 동네 상세를 연다.
//
// 법정동과 행정동은 서로 코드 체계가 달라 같은 키로 취급하면 안 된다.
// 그래서 한 칸에 섞어 담지 않고 항목을 따로 두었고, 분석 결과가 붙으면
// adminCode 가 채워지고 neighborhoodId 가 비게 된다.
@Getter
@Setter
public class NeighborhoodRecommendationItemDto {

    // 행정동 코드. 군집 분석 결과가 붙기 전에는 값이 없다.
    private String adminCode;

    // 행정동 이름. 분석 결과가 붙기 전에는 법정동 이름이 들어간다.
    private String adminName;

    private String districtName;

    private double score;

    // 군집 이름(역세권 밀집형 등). 군집 분석 결과가 붙기 전에는 값이 없다.
    private String clusterName;

    private List<String> reasons = new ArrayList<>();

    // 현재 동네 테이블(법정동)의 id. 분석 결과가 붙기 전까지 동네 상세로 이동하는 데 쓴다.
    private Long neighborhoodId;
}
