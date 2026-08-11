package com.brentversal.agency.repository;

import com.brentversal.agency.entity.AgencyReview;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AgencyReviewRepository extends JpaRepository<AgencyReview, Long> {

    // 중개사무소의 후기 목록 (최신순) - 중개사무소 상세 페이지에서 전체를 보여 줄 때 쓴다
    List<AgencyReview> findByAgencyIdOrderByIdDesc(Long agencyId);

    // 중개사무소의 후기 개수
    long countByAgencyId(Long agencyId);

    // 같은 사람이 같은 사무소에 후기를 여러 번 쓰지 못하게 막을 때 쓴다.
    boolean existsByAgencyIdAndMemberId(Long agencyId, Long memberId);

    // ── 중개인 마이페이지의 "리뷰 관리" 탭에서 쓰는 조회 ────────────────
    // 한 페이지에 10개씩 끊어 보여 주므로 Pageable 을 받는 형태로 만든다.
    // 위의 목록 메소드와 이름이 같아도 매개변수가 달라(오버로딩) 문제가 없다.
    Page<AgencyReview> findByAgencyIdOrderByIdDesc(Long agencyId, Pageable pageable);

    // 미답변만 보기 (reply 컬럼이 비어 있는 것)
    Page<AgencyReview> findByAgencyIdAndReplyIsNullOrderByIdDesc(Long agencyId, Pageable pageable);

    // 답변 완료만 보기
    Page<AgencyReview> findByAgencyIdAndReplyIsNotNullOrderByIdDesc(Long agencyId, Pageable pageable);

    // 미답변 리뷰 개수 (리뷰 관리 탭 상단의 "미답변 리뷰" 숫자)
    long countByAgencyIdAndReplyIsNull(Long agencyId);
}
