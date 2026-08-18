package com.brentversal.agency.repository;

import com.brentversal.agency.entity.Agency;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

// JpaRepository<관리하고자하는엔터티이름, 해당엔터티의기본키의타입> (Agency의 기본키인 id의 타입은 Long)
public interface AgencyRepository extends JpaRepository<Agency, Long> {

    // 검색어(사무소명 또는 공인중개사명)와 지역(구·동)으로 조회하는 메소드
    // 조건이 모두 선택 사항이라 메소드 이름 규칙(findBy...)으로는 표현이 어려워 JPQL 을 직접 작성했다.
    // 조건을 안 고르면 서비스에서 빈 문자열("")을 넘긴다.
    // like '%%' 는 모든 행과 일치하므로, 조건을 안 넘긴 것과 같은 효과가 난다.
    //
    // 동은 주소 문자열로 찾을 수 없다. 도로명 주소에는 동이 들어 있지 않기 때문이다
    // ("서울시 영등포구 당산로 222"). 그래서 주소 검색이 채워 준 dong 컬럼으로 맞추고,
    // 그 컬럼이 비어 있는 예전 자료만 주소 문자열에서 찾아 보는 방식으로 함께 걸러 준다.
    //
    // dong 은 앞부분이 같은 것까지 함께 찾는다. 화면에서 "당산동 전체"를 고르면 "당산동"이 오는데,
    // 정확히 일치만 보면 당산동1가~6가 사무소가 빠져 "전체"라는 말과 맞지 않기 때문이다.
    @Query("select a from Agency a " +
           " where (a.name like concat('%', :keyword, '%') " +
           "        or a.brokerName like concat('%', :keyword, '%')) " +
           "   and a.address like concat('%', :region, '%') " +
           "   and (:dong = '' " +
           "        or a.dong like concat(:dong, '%') " +
           "        or (a.dong is null and a.address like concat('%', :dong, '%'))) " +
           " order by a.id desc")
    List<Agency> search(@Param("keyword") String keyword,
                        @Param("region") String region,
                        @Param("dong") String dong);

    // 관리자 인증이 완료된 중개사무소의 개수 (화면 상단 "인증 중개사무소 OO곳" 표시용)
    long countByVerifiedTrue();

    // 로그인한 중개인이 자기 사무소를 열 때 쓴다 ("내 중개사무소" 페이지).
    // Agency 가 Member 를 @ManyToOne 으로 갖고 member_id 에 unique 제약이 있어 결과는 최대 1건이다.
    Optional<Agency> findByMemberId(Long memberId);
}
