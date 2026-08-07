package com.brentversal.property.constant;

public enum PropertyStatus {
    ACTIVE,         // 게시중
    IN_PROGRESS,    // 거래진행중
    COMPLETED,      // 거래완료 (되돌릴 수 없음)
    CANCELLED,      // 등록취소 (되돌릴 수 없음)
    HIDDEN          // 비공개
}
