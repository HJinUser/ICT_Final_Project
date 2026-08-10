package com.brentversal.agency.repository;

import com.brentversal.agency.entity.AgencyReview;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AgencyReviewRepository extends JpaRepository<AgencyReview, Long> {

    // 중개사무소의 후기 목록 (최신순)
    List<AgencyReview> findByAgencyIdOrderByIdDesc(Long agencyId);

    // 중개사무소의 후기 개수
    long countByAgencyId(Long agencyId);

    // 같은 사람이 같은 사무소에 후기를 여러 번 쓰지 못하게 막을 때 쓴다.
    boolean existsByAgencyIdAndMemberId(Long agencyId, Long memberId);
}
