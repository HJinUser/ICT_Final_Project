package com.brentversal.propertyreview.repository;

import com.brentversal.propertyreview.entity.PropertyReview;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface PropertyReviewRepository extends JpaRepository<PropertyReview, Long> {

    // 한 사람이 같은 매물에 이미 쓴 글이 있는지 확인할 때 쓴다 (있으면 고쳐 쓴다).
    Optional<PropertyReview> findByPropertyIdAndMemberId(Long propertyId, Long memberId);

    // 매물 한줄평 목록. 작성자 이름을 함께 보여 주므로 Member 를 같이 읽어 N+1 을 막는다.
    @Query("select r from PropertyReview r " +
           "  left join fetch r.member " +
           " where r.property.id = :propertyId " +
           " order by r.updatedAt desc")
    List<PropertyReview> findByPropertyId(Long propertyId);

    // 이 회원이 쓴 한줄평 전체 (탈퇴 시 작성자 연결만 끊을 때 씀)
    List<PropertyReview> findByMemberId(Long memberId);
}
