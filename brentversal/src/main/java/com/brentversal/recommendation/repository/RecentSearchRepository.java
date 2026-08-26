package com.brentversal.recommendation.repository;

import com.brentversal.recommendation.entity.RecentSearch;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

// 회원의 최근 검색 기록을 최신순으로 조회하고 저장하는 리포지터리다.
public interface RecentSearchRepository extends JpaRepository<RecentSearch, Long> {

    // 추천 점수에는 최근 것만 쓴다. 오래된 검색까지 전부 반영하면 지금 찾는 조건이 묻히기 때문이다.
    List<RecentSearch> findTop10ByMemberIdOrderByCreatedAtDesc(Long memberId);

    // 탈퇴 시 이 회원의 검색 기록을 전부 지울 때 쓴다 (findTop10...은 추천 계산용이라 10개로 끊겨 있어서 못 씀)
    List<RecentSearch> findByMemberId(Long memberId);
}
