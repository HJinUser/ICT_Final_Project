package com.brentversal.report.service;

public class ReportMemberNotFoundException extends RuntimeException {

    public ReportMemberNotFoundException() {
        super("인증된 회원 정보를 찾을 수 없습니다.");
    }
}
