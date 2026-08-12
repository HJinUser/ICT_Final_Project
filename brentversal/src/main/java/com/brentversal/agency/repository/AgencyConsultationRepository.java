package com.brentversal.agency.repository;

import com.brentversal.agency.constant.ConsultationStatus;
import com.brentversal.agency.entity.AgencyConsultation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AgencyConsultationRepository extends JpaRepository<AgencyConsultation, Long> {

    // 이 회원이 이 중개사무소에 상담을 요청한 적이 있는지 확인한다.
    // 후기(이용자 평가) 작성 자격을 판단할 때 쓴다.
    boolean existsByAgencyIdAndMemberId(Long agencyId, Long memberId);

    // ── 중개인 마이페이지의 "문의 관리" 에서 쓰는 조회 ────────────────
    // 내 사무소로 들어온 상담 요청 전체 (최신순)
    List<AgencyConsultation> findByAgencyIdOrderByCreatedAtDesc(Long agencyId);

    // 상태별 필터 (답변 대기 / 답변 완료 / 종료)
    List<AgencyConsultation> findByAgencyIdAndStatusOrderByCreatedAtDesc(Long agencyId, ConsultationStatus status);

    // 상태별 건수. 대시보드 숫자와 알림 배지(답변 대기 건수)에 쓴다.
    long countByAgencyIdAndStatus(Long agencyId, ConsultationStatus status);

    // ── 사용자의 "내 상담" 화면에서 쓰는 조회 ─────────────────────────
    // 내가 보낸 상담 요청 전체 (최신순)
    List<AgencyConsultation> findByMemberIdOrderByCreatedAtDesc(Long memberId);

    // 답변이 왔는데 아직 확인하지 않은 상담. 헤더 알림에 쓴다.
    List<AgencyConsultation> findByMemberIdAndReplyIsNotNullAndReplyCheckedAtIsNullOrderByRepliedAtDesc(Long memberId);
}
