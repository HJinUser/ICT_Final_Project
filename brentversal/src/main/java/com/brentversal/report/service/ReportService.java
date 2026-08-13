package com.brentversal.report.service;

import com.brentversal.agency.repository.AgencyRepository;
import com.brentversal.agency.repository.AgencyReviewRepository;
import com.brentversal.member.entity.Member;
import com.brentversal.member.repository.MemberRepository;
import com.brentversal.property.repository.PropertyRepository;
import com.brentversal.report.dto.PublicReportResponse;
import com.brentversal.report.dto.ReportCreateRequest;
import com.brentversal.report.dto.ReportProcessRequest;
import com.brentversal.report.dto.ReportResponse;
import com.brentversal.report.entity.ReportEntity;
import com.brentversal.report.entity.ReportStatus;
import com.brentversal.report.entity.ReportTargetType;
import com.brentversal.report.repository.ReportRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional(readOnly = true)
public class ReportService {

    private final ReportRepository reportRepository;
    private final MemberRepository memberRepository;
    private final PropertyRepository propertyRepository;
    private final AgencyRepository agencyRepository;
    private final AgencyReviewRepository agencyReviewRepository;

    public ReportService(
            ReportRepository reportRepository,
            MemberRepository memberRepository,
            PropertyRepository propertyRepository,
            AgencyRepository agencyRepository,
            AgencyReviewRepository agencyReviewRepository
    ) {
        this.reportRepository = reportRepository;
        this.memberRepository = memberRepository;
        this.propertyRepository = propertyRepository;
        this.agencyRepository = agencyRepository;
        this.agencyReviewRepository = agencyReviewRepository;
    }

    @Transactional
    public ReportResponse create(
            ReportCreateRequest request,
            String reporterEmail
    ) {
        Member reporter = getMember(reporterEmail);
        validateTarget(request.getTargetType(), request.getTargetId());
        ReportEntity report = ReportEntity.create(
                reporter,
                request.getTargetType(),
                request.getTargetId(),
                request.getTitle(),
                request.getContent()
        );

        return ReportResponse.from(reportRepository.save(report));
    }

    public List<PublicReportResponse> findPublicHistory() {
        return reportRepository.findAllByOrderByCreatedAtDesc()
                .stream()
                .map(PublicReportResponse::from)
                .toList();
    }

    public List<ReportResponse> findMine(String reporterEmail) {
        return reportRepository
                .findAllByReporter_EmailOrderByCreatedAtDesc(reporterEmail)
                .stream()
                .map(ReportResponse::from)
                .toList();
    }

    public List<ReportResponse> findAll(
            ReportStatus status,
            ReportTargetType targetType
    ) {
        List<ReportEntity> reports = targetType == null
                ? reportRepository.findAllByStatusOrderByCreatedAtDesc(status)
                : reportRepository.findAllByStatusAndTargetTypeOrderByCreatedAtDesc(
                        status,
                        targetType
                );

        return reports.stream()
                .map(ReportResponse::from)
                .toList();
    }

    public ReportResponse findById(Long id) {
        return ReportResponse.from(getReport(id));
    }

    @Transactional
    public ReportResponse process(
            Long id,
            ReportProcessRequest request,
            String processorEmail
    ) {
        ReportEntity report = getReport(id);
        Member processor = getMember(processorEmail);

        report.process(
                request.getStatus(),
                request.getAnswerContent(),
                processor
        );

        return ReportResponse.from(report);
    }

    private ReportEntity getReport(Long id) {
        return reportRepository.findById(id)
                .orElseThrow(() -> new ReportNotFoundException(id));
    }

    private Member getMember(String email) {
        Member member = memberRepository.findByEmail(email);
        if (member == null) {
            throw new ReportMemberNotFoundException();
        }
        return member;
    }

    private void validateTarget(ReportTargetType targetType, Long targetId) {
        boolean exists = switch (targetType) {
            case PROPERTY -> propertyRepository.existsById(targetId);
            case AGENCY -> agencyRepository.existsById(targetId);
            case REVIEW -> agencyReviewRepository.existsById(targetId);
        };

        if (!exists) {
            throw new ReportTargetNotFoundException(targetType, targetId);
        }
    }
}
