package com.brentversal.realestate.repository;

import com.brentversal.realestate.entity.RealEstateTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface RealEstateTransactionRepository
        extends JpaRepository<RealEstateTransaction, Long> {

    Optional<RealEstateTransaction> findBySourceNameAndSourceItemId(
            String sourceName,
            String sourceItemId
    );

    List<RealEstateTransaction> findByRegionCodeAndDealDateBetweenOrderByDealDateDesc(
            String regionCode,
            LocalDate from,
            LocalDate to
    );

    /*
      매물 상세의 "실거래가 추이" — 같은 시군구·비슷한 면적의 아파트 매매가를 연도별로 평균 낸다.

      면적을 함께 거르는 이유 : 같은 구라도 24평과 45평이 섞이면 평균이 매물 호가와
      비교할 수 없는 숫자가 된다. 그래서 이 매물 전용면적의 일정 범위만 본다.

      취소된 거래(is_canceled)는 실제로 이루어지지 않은 거래라 평균에서 뺀다.
      집계는 DB 에 맡긴다. 거래 기록을 전부 읽어 와서 자바에서 세면 자료가 쌓일수록
      읽는 양이 그대로 늘어나기 때문이다.

      반환값은 [연도, 평균 거래금액(만원), 건수] 순서의 Object[] 목록이다.
    */
    @Query("select year(t.dealDate), avg(t.dealPrice), count(t) " +
           "  from RealEstateTransaction t " +
           " where t.regionCode = :regionCode " +
           "   and t.canceled = false " +
           "   and t.area between :minArea and :maxArea " +
           " group by year(t.dealDate) " +
           " order by year(t.dealDate)")
    List<Object[]> findYearlyAverageByRegionAndArea(@Param("regionCode") String regionCode,
                                                    @Param("minArea") BigDecimal minArea,
                                                    @Param("maxArea") BigDecimal maxArea);
}
