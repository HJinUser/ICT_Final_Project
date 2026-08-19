package com.brentversal.property.constant;

// 관리자가 AI 시세를 참고해 선택하는 저평가·적정·고평가 세 상태를 정의하는 Enum임
public enum PriceEvaluationStatus {
    UNDERVALUED, // 저평가
    FAIR,        // 적정
    OVERVALUED   // 고평가
}