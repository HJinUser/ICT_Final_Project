package com.brentversal.recommendation.entity;

import com.brentversal.member.entity.Member;
import com.brentversal.property.entity.Property;
import com.brentversal.recommendation.constant.RecommendationFeedbackType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

import java.time.LocalDateTime;

// 사용자가 추천 매물에 남긴 LIKE 또는 DISLIKE 평가를 저장하는 엔터티다.
//
// 평가 당시의 점수(recommendationScore)와 모델 버전(modelVersion)을 함께 남긴다.
// 나중에 추천 모델을 바꿨을 때 "어느 버전이 준 추천에 사용자가 만족했는가"를 버전별로 비교하기 위해서다.
// 같은 매물에 대한 평가는 한 사람당 하나만 남으므로 member_id 와 property_id 를 유니크로 묶는다.
@Getter
@Setter
@ToString
@Entity
@Table(
        name = "recommendation_feedback",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_recommendation_feedback_member_property",
                columnNames = {"member_id", "property_id"}
        )
)
public class RecommendationFeedback {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "feedback_id")
    private Long id;

    @ToString.Exclude
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id", nullable = false)
    private Member member;

    @ToString.Exclude
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "property_id", nullable = false)
    private Property property;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private RecommendationFeedbackType type;

    // 평가할 때 화면에 떠 있던 추천 적합도. 확률이 아니라 0~100 으로 변환한 적합 점수다.
    @Column(name = "recommendation_score")
    private Double recommendationScore;

    @Column(name = "model_version", length = 50)
    private String modelVersion;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
