package com.brentversal.property.constant;

// 매물의 임시저장부터 승인·거래완료까지 업무 상태값을 정의하는 Enum임
public enum PropertyStatus {
    DRAFT,          // 중개인이 작성 중인 임시 저장 매물
    PENDING,        // 관리자 승인 대기
    ACTIVE,         // 게시중
    IN_PROGRESS,    // 거래진행중
    COMPLETED,      // 거래완료
    CANCELLED       // 등록취소
}