package com.brentversal.Agency.repository;

import com.brentversal.Agency.entity.Agency;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

// JpaRepository<관리하고자하는엔터티이름, 해당엔터티의기본키의타입> (Agency의 기본키인 id의 타입은 Long)
public interface AgencyRepository extends JpaRepository<Agency, Long> {

    // 검색어(사무소명 또는 공인중개사명)와 지역(주소)으로 조회하는 메소드
    // 두 조건이 모두 선택 사항이라 메소드 이름 규칙(findBy...)으로는 표현이 어려워 JPQL 을 직접 작성했다.
    // 검색어가 없을 때는 서비스에서 빈 문자열("")을 넘긴다.
    // like '%%' 는 모든 행과 일치하므로, 조건을 안 넘긴 것과 같은 효과가 난다.
    @Query("select a from Agency a " +
           " where (a.name like concat('%', :keyword, '%') " +
           "        or a.brokerName like concat('%', :keyword, '%')) " +
           "   and a.address like concat('%', :region, '%') " +
           " order by a.id desc")
    List<Agency> search(@Param("keyword") String keyword, @Param("region") String region);

    // 관리자 인증이 완료된 중개사무소의 개수 (화면 상단 "인증 중개사무소 OO곳" 표시용)
    long countByVerifiedTrue();
}
