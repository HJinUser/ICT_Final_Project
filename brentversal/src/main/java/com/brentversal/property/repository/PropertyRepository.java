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
           "   and (:region is null or p.address like concat('%', :region, '%')) " +
           "   and (:dong is null or p.address like concat('%', :dong, '%')) " +
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
                          @Param("region") String region,
                          @Param("dong") String dong,
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

    // 동네 탐색 카드에 표시할 공개·게시중 매물 건수
    long countByNeighborhoodIdAndStatusAndVisibleTrue(Long neighborhoodId, PropertyStatus status);

}
