package com.brentversal.common.ml;

// 이 클래스에서 사용할 Java/Spring/프로젝트 타입 불러옴
import java.util.Map;

// FastAPI가 반환한 거래유형별 AI 가격·역거리·주변시설·모델버전을 받는 응답 record임
public record MlPriceResponse(
        Long aiPrice,
        Long aiDeposit,
        Long aiMonthlyDeposit,
        Long aiMonthlyRent,
        Double stationDistance,
        Map<String, Object> nearby,
        String modelVersion
) {}