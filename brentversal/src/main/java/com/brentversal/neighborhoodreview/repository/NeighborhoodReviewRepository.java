package com.brentversal.neighborhoodreview.repository;

// 이 클래스에서 사용할 Java/Spring/프로젝트 타입 불러옴
import com.brentversal.neighborhoodreview.entity.NeighborhoodReview;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

// 행정동별 한줄평 목록과 회원별 기존 한줄평을 조회하는 Repository임
public interface NeighborhoodReviewRepository extends JpaRepository<NeighborhoodReview, Long> {
    Optional<NeighborhoodReview> findByMemberIdAndAdminCode(Long memberId, String adminCode);
    List<NeighborhoodReview> findTop50ByAdminCodeOrderByUpdatedAtDesc(String adminCode);
}