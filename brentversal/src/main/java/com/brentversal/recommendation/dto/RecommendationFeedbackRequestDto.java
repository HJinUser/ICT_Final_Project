package com.brentversal.recommendation.dto;

import com.brentversal.recommendation.constant.RecommendationFeedbackType;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

// 추천 카드에서 누른 LIKE, DISLIKE 평가를 받는 요청이다.
//
// 평가 당시 화면에 떠 있던 적합도와 모델 버전을 함께 받는다.
// 나중에 추천 모델이 바뀌었을 때 어느 버전이 만든 추천이 좋은 평가를 받았는지 비교하기 위해서다.
@Getter
@Setter
public class RecommendationFeedbackRequestDto {

    @NotNull(message = "평가할 매물을 선택해 주세요.")
    private Long propertyId;

    @NotNull(message = "평가 종류는 필수입니다.")
    private RecommendationFeedbackType type;

    // 취향 초기설정 화면처럼 점수 없이 평가만 남기는 경우가 있어 필수로 두지 않는다.
    private Double recommendationScore;

    private String modelVersion;
}
