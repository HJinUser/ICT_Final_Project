package com.brentversal.property.dto;

// DRAFT 시세예측 후 AI 가격·역거리·모델버전을 프론트에 내려주는 응답 DTO record임
public record AiPricePreviewResponseDto(
        Long draftId,
        Long aiPrice,
        Long aiDeposit,
        Long aiMonthlyDeposit,
        Long aiMonthlyRent,
        Double stationDistance,
        String modelVersion
) {
}