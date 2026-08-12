package com.brentversal.report.repository;

import com.brentversal.report.entity.ReportEntity;
import com.brentversal.report.entity.ReportStatus;
import com.brentversal.report.entity.ReportTargetType;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReportRepository extends JpaRepository<ReportEntity, Long> {

    /**
     * 로그인한 사용자가 접수한 신고를 최신순으로 조회한다.
     */
    @EntityGraph(attributePaths = {"reporter", "processor"})
    List<ReportEntity> findAllByReporter_EmailOrderByCreatedAtDesc(String email);

    /**
     * 관리자가 처리 상태별 신고를 최신순으로 조회한다.
     */
    @EntityGraph(attributePaths = {"reporter", "processor"})
    List<ReportEntity> findAllByStatusOrderByCreatedAtDesc(ReportStatus status);

    /**
     * 관리자가 처리 상태와 신고 대상 유형으로 신고를 검색한다.
     */
    @EntityGraph(attributePaths = {"reporter", "processor"})
    List<ReportEntity> findAllByStatusAndTargetTypeOrderByCreatedAtDesc(
            ReportStatus status,
            ReportTargetType targetType
    );
}
