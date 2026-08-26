package com.brentversal.property.repository;

import com.brentversal.property.constant.DealType;
import com.brentversal.property.constant.PropertyStatus;
import com.brentversal.property.constant.PropertyType;
import com.brentversal.property.entity.Property;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public interface PropertyRepository extends JpaRepository<Property, Long> {

    List<Property> findByIdIn(List<Long> ids);

    // 맞춤 추천의 후보로 쓸 매물을 가져온다.
    //
    // 지금 볼 수 있는 매물만 대상이며, 최근에 올라온 것부터 정해진 개수까지만 읽는다.
    // 전부 읽어서 점수를 매기면 매물이 늘어날수록 추천 한 번에 걸리는 시간이 함께 늘어나기 때문이다.
    List<Property> findTop200ByStatusAndVisibleTrueOrderByCreatedAtDesc(PropertyStatus status);

    // ↓ 중개사무소 상세 페이지(담당 매물 영역)에서 쓰는 조회 메소드들
    // 게시중(ACTIVE)이면서 공개(visible=true)인 매물만 다른 화면에 노출되므로 두 조건을 함께 건다.
    List<Property> findByAgencyIdAndStatusAndVisibleTrueOrderByCreatedAtDesc(Long agencyId, PropertyStatus status);

    // 담당 매물 전체 건수
    long countByAgencyIdAndStatusAndVisibleTrue(Long agencyId, PropertyStatus status);

    // 오늘 새로 올라온 매물 건수 (from 에 오늘 0시를 넘긴다)
    long countByAgencyIdAndStatusAndVisibleTrueAndCreatedAtAfter(Long agencyId, PropertyStatus status, LocalDateTime from);

    // ↓ 중개인 마이페이지("내 중개사무소")에서 쓰는 조회 메소드들
    // 내가 등록한 매물은 비공개·승인대기까지 모두 보여야 하므로 상태 조건 없이 가져온다.
    // 한 페이지에 6개씩(2행 3열) 끊어 보여 주기 때문에 Pageable 을 받는다.
    Page<Property> findByAgencyIdOrderByCreatedAtDesc(Long agencyId, Pageable pageable);

    // 대시보드의 "게시 중 / 거래 진행 중 / 거래 완료" 건수 (공개 여부와 상관없이 센다)
    long countByAgencyIdAndStatus(Long agencyId, PropertyStatus status);

    // 대시보드의 "등록 매물 수" (상태와 상관없이 이 사무소가 올린 전체)
    long countByAgencyId(Long agencyId);

    // ↓ 관리자 "매물 관리" 화면에서 쓰는 조회 메소드들
    // 승인 대기 목록은 오래 기다린 것부터 처리해야 하므로 등록일 오름차순으로 가져온다.
    Page<Property> findByStatusOrderByCreatedAtAsc(PropertyStatus status, Pageable pageable);

    // 상태 구분 없이 전체를 볼 때는 최신 등록순으로 보여 준다.
    Page<Property> findAllByOrderByCreatedAtDesc(Pageable pageable);

    // 상단 요약의 "승인 대기" 건수
    long countByStatus(PropertyStatus status);

    // ↓ 지도 검색 화면에서 쓰는 조회
    //
    // 조건을 안 고른 항목은 프론트가 값을 안 보내고, 서비스가 null 로 넘긴다.
    // "값이 null 이면 그 조건은 건너뛴다"를 각 줄의 (:param is null or ...) 로 표현했다.
    // 조건 조합이 많아 메소드 이름으로는 표현할 수 없어서 JPQL 로 직접 적었다.
    //
    // 대표 금액은 거래 유형마다 쓰는 칸이 달라서(매매=price, 전세=deposit, 월세=monthlyDeposit)
    // coalesce 로 하나로 합쳐 비교한다.
    // 방 개수는 여러 개를 함께 고를 수 있어서 목록으로 받는다(:roomCounts).
    // "3개 이상"은 서비스가 3,4,5,6 처럼 펼쳐서 넣어 준다.
    //
    // 특수 조건(태그)은 고른 것을 "모두" 가진 매물만 남긴다.
    // 매물이 가진 태그 중 고른 태그와 겹치는 개수를 세어, 고른 개수와 같은지 확인한다.
    @Query("select p from Property p " +
           " where p.status = :status and p.visible = true " +
           // 상단 검색창의 자유 검색어. 지역만 찾는 게 아니라 매물 이름까지 함께 훑는다.
           // "반포동"으로도, "반포 리버뷰"로도 찾을 수 있어야 하기 때문이다.
           // 대소문자를 가리지 않도록 양쪽을 lower 로 맞춘다.
           "   and (:keyword is null " +
           "        or lower(p.name) like lower(concat('%', :keyword, '%')) " +
           "        or lower(p.address) like lower(concat('%', :keyword, '%')) " +
           "        or lower(p.sigungu) like lower(concat('%', :keyword, '%')) " +
           "        or lower(p.dong) like lower(concat('%', :keyword, '%'))) " +
           // 구는 주소 검색이 채워 준 컬럼으로 정확히 맞춘다.
           // 컬럼이 비어 있는 예전 자료는 주소 문자열에서 찾아 보는 방식으로 함께 걸러 준다(동도 같다).
           "   and (:region is null " +
           "        or p.sigungu = :region " +
           "        or (p.sigungu is null and p.address like concat('%', :region, '%'))) " +
           // 동은 앞부분이 같은 것까지 함께 찾는다.
           // 화면에서 "당산동 전체"를 고르면 dong 으로 "당산동"이 오는데,
           // 정확히 일치만 보면 당산동1가~6가 매물이 빠져 "전체"라는 말과 맞지 않는다.
           // "당산동4가"처럼 하위 동을 직접 고른 경우에는 그 이름으로 시작하는 것이 자기 자신뿐이라
           // 결과가 달라지지 않는다.
           "   and (:dong is null " +
           "        or p.dong like concat(:dong, '%') " +
           "        or (p.dong is null and p.address like concat('%', :dong, '%'))) " +
           // 행정동은 등록할 때 좌표로 판정해 둔 값이라 이름 흔들림이 없어 정확히 맞춘다.
           // 값이 아직 없는 예전 매물은 이 조건을 걸면 빠지므로, 백필 전에는 결과가 적을 수 있다.
           "   and (:adminCode is null or p.adminCode = :adminCode) " +
           "   and (:type is null or p.type = :type) " +
           "   and (:dealType is null or p.dealType = :dealType) " +
           "   and (:agencyId is null or p.agency.id = :agencyId) " +
           "   and (:minPrice is null or coalesce(p.price, p.deposit, p.monthlyDeposit) >= :minPrice) " +
           "   and (:maxPrice is null or coalesce(p.price, p.deposit, p.monthlyDeposit) <= :maxPrice) " +
           "   and (:minArea is null or p.area >= :minArea) " +
           "   and (:maxArea is null or p.area <= :maxArea) " +
           "   and (:roomCounts is null or p.roomCount in :roomCounts) " +
           "   and (:tagCount = 0 or " +
           "        (select count(t) from p.tags t where t.id in :tagIds) = :tagCount) " +
           " order by p.createdAt desc")
    List<Property> search(@Param("status") PropertyStatus status,
                          @Param("keyword") String keyword,
                          @Param("region") String region,
                          @Param("dong") String dong,
                          @Param("adminCode") String adminCode,
                          @Param("type") PropertyType type,
                          @Param("dealType") DealType dealType,
                          @Param("agencyId") Long agencyId,
                          @Param("minPrice") Long minPrice,
                          @Param("maxPrice") Long maxPrice,
                          @Param("minArea") BigDecimal minArea,
                          @Param("maxArea") BigDecimal maxArea,
                          @Param("roomCounts") List<Integer> roomCounts,
                          @Param("tagIds") List<Long> tagIds,
                          @Param("tagCount") long tagCount);

    // 행정동을 아직 안 적어 둔 매물을 찾는다. 좌표가 없으면 판정할 수 없으므로 함께 거른다.
    // 행정동 저장 기능이 생기기 전에 등록된 매물을 채워 넣을 때(백필) 쓴다.
    @Query("select p from Property p " +
           " where p.adminCode is null " +
           "   and p.latitude is not null " +
           "   and p.longitude is not null " +
           " order by p.id asc")
    List<Property> findMissingAdminCode();

    // 매물 확인 화면 - 매물유형별로 실제 존재하는 거래유형만 뽑는다 (type이 null이면 전체 대상).
    @Query("select distinct p.dealType from Property p " +
            " where p.status = :status and p.visible = true " +
            "   and (:type is null or p.type = :type)")
    List<DealType> findDistinctDealTypes(@Param("status") PropertyStatus status,
                                         @Param("type") PropertyType type);

    // 매물 확인 화면
    // 정렬은 Pageable의 Sort에 맡긴다 (Service의 toSort() 참고).
    @Query("select p from Property p " +
            " where p.status = :status and p.visible = true " +
            "   and (:type is null or p.type = :type) " +
            "   and (:dealType is null or p.dealType = :dealType)")
    Page<Property> findForListings(@Param("status") PropertyStatus status,
                                   @Param("type") PropertyType type,
                                   @Param("dealType") DealType dealType,
                                   Pageable pageable);

    // 동네 탐색 카드에 표시할 공개·게시중 매물 건수
    long countByNeighborhood_IdAndStatusAndVisibleTrue(Long neighborhoodId, PropertyStatus status);

    // 동네 탐색 카드의 "평균 전세가". 전세(JEONSE) 매물의 deposit 만 평균 낸다.
    // 해당 동네에 전세 매물이 하나도 없으면 avg 가 null 이 되므로, 서비스 쪽에서 0 으로 바꿔 준다.
    @Query("select avg(p.deposit) from Property p " +
           " where p.neighborhood.id = :neighborhoodId and p.status = :status and p.visible = true " +
           "   and p.dealType = com.brentversal.property.constant.DealType.JEONSE")
    Double findAverageJeonseDepositByNeighborhoodId(@Param("neighborhoodId") Long neighborhoodId,
                                                      @Param("status") PropertyStatus status);

    // 매물 등록 페이지 왼쪽 위의 사용자 임시저장 목록.
    // visible=true인 DRAFT만 사용자가 직접 만든 신규 등록 DRAFT로 사용함
    List<Property> findByAgencyIdAndStatusAndVisibleTrueOrderByUpdatedAtDesc(
            Long agencyId,
            PropertyStatus status
    );

    // 기존 "내 매물"에서는 DRAFT를 제외함
    Page<Property> findByAgencyIdAndStatusNotOrderByCreatedAtDesc(
            Long agencyId,
            PropertyStatus status,
            Pageable pageable
    );

    // 중개인 대시보드의 "등록 매물 수"에서도 DRAFT를 제외함
    long countByAgencyIdAndStatusNot(
            Long agencyId,
            PropertyStatus status
    );

    // 관리자 ALL 목록에서도 DRAFT를 제외함
    Page<Property> findByStatusNotOrderByCreatedAtDesc(
            PropertyStatus status,
            Pageable pageable
    );

    List<Property> findByAgencyId(Long agencyId);
}
