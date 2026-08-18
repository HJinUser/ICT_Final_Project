package com.brentversal.recommendation.repository;

import com.brentversal.recommendation.constant.RecommendationFeedbackType;
import com.brentversal.recommendation.entity.RecommendationFeedback;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

// 추천 매물에 남긴 LIKE, DISLIKE 기록을 조회하고 저장하는 리포지터리다.
// 관리자 화면에서 쓰는 추천 적합률 집계도 여기에서 함께 센다.
public interface RecommendationFeedbackRepository extends JpaRepository<RecommendationFeedback, Long> {

    // 추천 점수를 계산할 때 이 회원이 지금까지 남긴 평가를 한 번에 읽는다.
    // 매물마다 따로 조회하면 후보 수만큼 조회가 반복되므로 목록으로 받아 와서 메모리에서 나눈다.
    List<RecommendationFeedback> findByMemberId(Long memberId);

    // 같은 매물을 다시 평가하면 새로 만들지 않고 기존 기록을 고쳐 쓴다.
    Optional<RecommendationFeedback> findByMemberIdAndPropertyId(Long memberId, Long propertyId);

    long countByType(RecommendationFeedbackType type);

    long countByTypeAndUpdatedAtAfter(RecommendationFeedbackType type, LocalDateTime from);
}
