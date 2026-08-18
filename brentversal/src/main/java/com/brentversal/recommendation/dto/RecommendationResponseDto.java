package com.brentversal.recommendation.dto;

import lombok.Getter;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

// 맞춤 추천 화면이 한 번의 조회로 받는 응답 전체다.
//
// modelVersion 은 이 추천을 무엇이 계산했는지 알려 준다.
// 사용자가 평가를 남길 때 이 값을 함께 저장해 두면, 나중에 계산 방식을 바꿨을 때
// 어느 방식이 만든 추천이 좋은 평가를 받았는지 버전끼리 비교할 수 있다.
@Getter
@Setter
public class RecommendationResponseDto {

    private String modelVersion;

    private List<RecommendationItemDto> items = new ArrayList<>();

    private List<NeighborhoodRecommendationItemDto> neighborhoods = new ArrayList<>();
}
