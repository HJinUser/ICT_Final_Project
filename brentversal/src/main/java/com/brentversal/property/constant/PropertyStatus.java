package com.brentversal.property.constant;

public enum PropertyStatus {
    PENDING,        // 승인대기 (신규 등록 시 기본값, 관리자 승인 전)
    ACTIVE,         // 게시중
    IN_PROGRESS,    // 거래진행중
    COMPLETED,      // 거래완료 (되돌릴 수 없음)
    CANCELLED       // 등록취소 (되돌릴 수 없음)
}