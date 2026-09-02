package com.brentversal.recommendation.repository;

import com.brentversal.recommendation.constant.RecommendationFeedbackType;
import com.brentversal.recommendation.entity.RecommendationFeedback;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

// 추천 매물에 남긴 LIKE, DISLIKE 기록을 조회하고 저장하는 리포지터리다.
// 관리자 화면에서 쓰는 추천 적합률 집계도 여기에서 함께 센다.
public interface RecommendationFeedbackRepository extends JpaRepository<RecommendationFeedback, Long> {

    // 추천 점수를 계산할 때 이 회원이 지금까지 남긴 평가를 한 번에 읽는다.
    // 매물마다 따로 조회하면 후보 수만큼 조회가 반복되므로 목록으로 받아 와서 메모리에서 나눈다.
    List<RecommendationFeedback> findByMemberId(Long memberId);

    // 매물이 삭제될 때, 그 매물에 남은 좋아요/싫어요 평가를 모두 지우는 데 쓴다.
    List<RecommendationFeedback> findByPropertyId(Long propertyId);

    // 같은 매물을 다시 평가하면 새로 만들지 않고 기존 기록을 고쳐 쓴다.
    Optional<RecommendationFeedback> findByMemberIdAndPropertyId(Long memberId, Long propertyId);

    long countByType(RecommendationFeedbackType type);

    long countByTypeAndUpdatedAtAfter(RecommendationFeedbackType type, LocalDateTime from);

    // ── 중개인 홈 "머신러닝 평가" 에서 쓰는 집계 ──────────────────────
    //
    // 아래 세 조회는 모두 집계를 DB 에 맡긴다. 평가 기록을 전부 읽어 와서 자바에서 세면
    // 평가가 쌓일수록 읽는 양이 그대로 늘어나기 때문이다.

    // 내 사무소 매물이 받은 좋아요·싫어요 총합. 반환값은 [평가유형, 건수] 목록이다.
    @Query("select r.type, count(r) " +
           "  from RecommendationFeedback r " +
           " where r.property.agency.id = :agencyId " +
           " group by r.type")
    List<Object[]> countByTypeAndAgencyId(@Param("agencyId") Long agencyId);

    // 매물별 좋아요·싫어요 건수. 반환값은 [매물 id, 좋아요 수, 싫어요 수] 목록이다.
    //
    // 매물 정보(이름·호가·AI 예상 시세)는 여기서 함께 읽지 않는다.
    // group by 에 엔터티 컬럼을 모두 넣어야 해서 질의가 지저분해지기 때문이다.
    // 대신 서비스가 나온 id 들을 한 번에 모아 매물을 배치로 읽는다(findByIdIn).
    @Query("select r.property.id, " +
           "       sum(case when r.type = com.brentversal.recommendation.constant.RecommendationFeedbackType.LIKE then 1 else 0 end), " +
           "       sum(case when r.type = com.brentversal.recommendation.constant.RecommendationFeedbackType.DISLIKE then 1 else 0 end) " +
           "  from RecommendationFeedback r " +
           " where r.property.agency.id = :agencyId " +
           " group by r.property.id")
    List<Object[]> countByPropertyAndAgencyId(@Param("agencyId") Long agencyId);

    // 월별 평가 건수 (매물 반응 추이). 반환값은 [연, 월, 건수] 목록이다.
    @Query("select year(r.updatedAt), month(r.updatedAt), count(r) " +
           "  from RecommendationFeedback r " +
           " where r.property.agency.id = :agencyId " +
           "   and r.updatedAt >= :from " +
           " group by year(r.updatedAt), month(r.updatedAt)")
    List<Object[]> countMonthlyByAgencyId(@Param("agencyId") Long agencyId,
                                          @Param("from") LocalDateTime from);
}
