package com.brentversal.recommendation.repository;

import com.brentversal.recommendation.entity.UserPreference;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

// 회원 한 명의 취향 정보를 조회하고 저장하는 리포지터리다.
public interface UserPreferenceRepository extends JpaRepository<UserPreference, Long> {

    // 매물 유형과 선호 지역은 별도 테이블(ElementCollection)에 들어 있어서,
    // 그냥 조회하면 취향 한 건을 읽을 때마다 추가 조회가 두 번 더 나간다.
    // 추천을 계산할 때 항상 함께 쓰는 값이라 처음부터 같이 읽는다.
    @EntityGraph(attributePaths = {"preferredPropertyTypes", "preferredDistricts"})
    Optional<UserPreference> findByMemberId(Long memberId);
}
