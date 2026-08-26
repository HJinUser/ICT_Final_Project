package com.brentversal.favorite.repository;

import com.brentversal.favorite.entity.Favorite;
import com.brentversal.favorite.entity.FavoriteId;
import com.brentversal.member.entity.Member;
import com.brentversal.property.entity.Property;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface FavoriteRepository extends JpaRepository<Favorite, FavoriteId> {
    // 토글 처리(있으면 삭제, 없으면 생성)할 때 현재 찜 여부부터 확인하는 용도
    Optional<Favorite> findByMemberAndProperty(Member member, Property property);

    // 로그인한 회원의 관심매물 목록 (관심목록 화면용)
    List<Favorite> findByMember(Member member);

    // 동네 탐색 카드의 "인기도" = 그 동네에 속한 매물들이 받은 찜(관심매물) 총합
    // Property.neighborhoodId(Long)가 Neighborhood 연관관계로 바뀌면서 경로가 한 단계 늘었다.
    long countByProperty_Neighborhood_Id(Long neighborhoodId);

    /*
      중개인 홈의 "매물 반응 추이" — 내 사무소 매물이 월별로 몇 번 관심 등록됐는지.

      집계를 DB 에 맡긴다. 기록을 전부 읽어 와서 자바에서 세면 매물·회원이 늘어날수록
      읽는 양이 그대로 늘어나기 때문이다.
      year()/month() 는 JPQL 표준 함수라 DB 를 바꿔도 그대로 쓸 수 있다.

      반환값은 [연, 월, 건수] 순서의 Object[] 목록이다.
    */
    @Query("select year(f.createdAt), month(f.createdAt), count(f) " +
           "  from Favorite f " +
           " where f.property.agency.id = :agencyId " +
           "   and f.createdAt >= :from " +
           " group by year(f.createdAt), month(f.createdAt)")
    List<Object[]> countMonthlyByAgencyId(@Param("agencyId") Long agencyId,
                                          @Param("from") LocalDateTime from);

    // 내 사무소 매물별 관심 등록 수. 반환값은 [매물 id, 건수] 목록이다.
    // 매물을 한 건씩 돌면서 세면 매물 수만큼 조회가 반복되므로 한 번에 모아 온다.
    @Query("select f.property.id, count(f) " +
           "  from Favorite f " +
           " where f.property.agency.id = :agencyId " +
           " group by f.property.id")
    List<Object[]> countByPropertyAndAgencyId(@Param("agencyId") Long agencyId);

    List<Favorite> findByProperty_Id(Long propertyId);
}