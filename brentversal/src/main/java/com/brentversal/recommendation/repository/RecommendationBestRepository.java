package com.brentversal.recommendation.repository;

import com.brentversal.recommendation.entity.RecommendationBest;
import org.springframework.data.jpa.repository.JpaRepository;

// 사용자별 BEST 매물 한 건을 조회하고 저장하고 지우는 리포지터리다.
// 기본키가 member_id 라서 회원 id 를 그대로 findById 에 넣으면 된다.
public interface RecommendationBestRepository extends JpaRepository<RecommendationBest, Long> {
}
