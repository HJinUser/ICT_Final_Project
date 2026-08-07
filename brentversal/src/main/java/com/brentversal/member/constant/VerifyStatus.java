package com.brentversal.member.constant;

// 중개인의 서류 검증 상태
public enum VerifyStatus {
    UNVERFIED, // 검증 안됨(기본값)
    PENDING, // 서류를 제출해 심사 대기 중
    VERIFIED // 심사 통과
}
