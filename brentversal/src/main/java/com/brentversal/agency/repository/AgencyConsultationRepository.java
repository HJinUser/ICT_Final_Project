package com.brentversal.agency.repository;

import com.brentversal.agency.entity.AgencyConsultation;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AgencyConsultationRepository extends JpaRepository<AgencyConsultation, Long> {

    // 이 회원이 이 중개사무소에 상담을 요청한 적이 있는지 확인한다.
    // 후기(이용자 평가) 작성 자격을 판단할 때 쓴다.
    boolean existsByAgencyIdAndMemberId(Long agencyId, Long memberId);
}
