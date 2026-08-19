package com.brentversal.common.ml;

// Spring이 FastAPI 시세예측 API에 보낼 매물 입력값을 묶는 요청 record임
public record MlPriceRequest(
        String propertyType,
        String dealType,
        String districtName,
        Double area,
        Integer floor,
        Integer buildYear,
        Double latitude,
        Double longitude
) {}