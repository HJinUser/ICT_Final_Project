package com.brentversal.editrequest.repository;

import com.brentversal.editrequest.constant.EditRequestStatus;
import com.brentversal.editrequest.entity.PropertyEditRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface PropertyEditRequestRepository extends JpaRepository<PropertyEditRequest, Long> {

    /*
      아래 조회는 모두 join fetch 를 쓴다.

      목록을 DTO 로 바꿀 때 매물명·사무소명·요청자명을 함께 읽는데, 지연 로딩인 채로 두면
      한 줄마다 select 가 더 나간다(N+1). 목록 길이만큼 조회가 늘어나므로 처음부터 함께 읽는다.
    */

    // 매물 1건의 수정 요청 이력 (관리자 화면)
    @Query("""
            select r from PropertyEditRequest r
            join fetch r.property p
            join fetch p.agency a
            join fetch r.requester m
            where p.id = :propertyId
            order by r.createdAt desc
            """)
    List<PropertyEditRequest> findByPropertyId(@Param("propertyId") Long propertyId);

    // 내 사무소로 들어온 수정 요청 전체 (중개인 화면)
    @Query("""
            select r from PropertyEditRequest r
            join fetch r.property p
            join fetch p.agency a
            join fetch r.requester m
            where a.id = :agencyId
            order by r.createdAt desc
            """)
    List<PropertyEditRequest> findByAgencyId(@Param("agencyId") Long agencyId);

    // 내 사무소로 들어온 수정 요청 중 아직 처리되지 않은 것 (중개인 화면·헤더 알림)
    @Query("""
            select r from PropertyEditRequest r
            join fetch r.property p
            join fetch p.agency a
            join fetch r.requester m
            where a.id = :agencyId
              and r.status = :status
            order by r.createdAt desc
            """)
    List<PropertyEditRequest> findByAgencyIdAndStatus(@Param("agencyId") Long agencyId,
                                                      @Param("status") EditRequestStatus status);

    // 매물을 수정했을 때 처리 완료로 바꿀 대상 (아직 처리되지 않은 요청)
    List<PropertyEditRequest> findByPropertyIdAndStatus(Long propertyId, EditRequestStatus status);
}
