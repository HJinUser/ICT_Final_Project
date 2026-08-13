package com.brentversal.report.service;

import com.brentversal.report.entity.ReportTargetType;

public class ReportTargetNotFoundException extends RuntimeException {

    public ReportTargetNotFoundException(ReportTargetType targetType, Long targetId) {
        super("신고 대상을 찾을 수 없습니다. (" + targetType + " #" + targetId + ")");
    }
}
