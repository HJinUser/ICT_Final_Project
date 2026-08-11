package com.brentversal.report.controller;

import com.brentversal.report.dto.ReportCreateRequest;
import com.brentversal.report.dto.ReportProcessRequest;
import com.brentversal.report.dto.ReportResponse;
import com.brentversal.report.entity.ReportStatus;
import com.brentversal.report.entity.ReportTargetType;
import com.brentversal.report.service.ReportService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/reports")
public class ReportController {

    private final ReportService reportService;

    public ReportController(ReportService reportService) {
        this.reportService = reportService;
    }

    @PostMapping
    public ResponseEntity<ReportResponse> create(
            @Valid @RequestBody ReportCreateRequest request,
            Authentication authentication
    ) {
        ReportResponse response = reportService.create(
                request,
                authentication.getName()
        );
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(response);
    }

    @GetMapping("/me")
    public ResponseEntity<List<ReportResponse>> findMine(
            Authentication authentication
    ) {
        return ResponseEntity.ok(
                reportService.findMine(authentication.getName())
        );
    }

    @GetMapping
    public ResponseEntity<List<ReportResponse>> findAll(
            @RequestParam(defaultValue = "PENDING") ReportStatus status,
            @RequestParam(required = false) ReportTargetType targetType
    ) {
        return ResponseEntity.ok(reportService.findAll(status, targetType));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ReportResponse> findById(@PathVariable Long id) {
        return ResponseEntity.ok(reportService.findById(id));
    }

    @PatchMapping("/{id}/process")
    public ResponseEntity<ReportResponse> process(
            @PathVariable Long id,
            @Valid @RequestBody ReportProcessRequest request,
            Authentication authentication
    ) {
        return ResponseEntity.ok(
                reportService.process(
                        id,
                        request,
                        authentication.getName()
                )
        );
    }
}
