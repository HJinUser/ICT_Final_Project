package com.brentversal.favorite.repository;

import com.brentversal.favorite.entity.Favorite;
import com.brentversal.favorite.entity.FavoriteId;
import com.brentversal.member.entity.Member;
import com.brentversal.property.entity.Property;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface FavoriteRepository extends JpaRepository<Favorite, FavoriteId> {
    // 토글 처리(있으면 삭제, 없으면 생성)할 때 현재 찜 여부부터 확인하는 용도
    Optional<Favorite> findByMemberAndProperty(Member member, Property property);

    // 로그인한 회원의 관심매물 목록 (관심목록 화면용)
    List<Favorite> findByMember(Member member);

    // 동네 탐색 카드의 "인기도" = 그 동네에 속한 매물들이 받은 찜(관심매물) 총합
    long countByProperty_Neighborhood_Id(Long neighborhoodId);
}