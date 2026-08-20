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
        // 매물 좌표가 속한 행정동. 서울 경계 밖이면 둘 다 null 이다.
        String adminCode,
        String adminName,
        Map<String, Object> nearby,
        String modelVersion
) {}