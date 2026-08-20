package com.brentversal.common.ml;

// 이 클래스에서 사용할 Java/Spring/프로젝트 타입 불러옴
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.Map;

// Spring에서 FastAPI의 시세예측·추천·관리자 ML API를 HTTP로 호출하는 공통 Client 클래스임
@Component
public class MlClient {

    private final RestClient restClient;

    public MlClient(@Value("${ml.base-url:http://127.0.0.1:8000}") String baseUrl) {
        this.restClient = RestClient.builder()
                .baseUrl(baseUrl)
                .build();
    }

    // Spring에서 FastAPI 시세예측 API를 호출하고 응답 DTO로 받는 메서드임
    public MlPriceResponse predictPrice(MlPriceRequest request) {
        // 시세예측 POST 요청을 /ml/price/predict로 보내고 응답 DTO로 변환함
        return restClient.post()
                .uri("/ml/price/predict")
                .body(request)
                .retrieve()
                .body(MlPriceResponse.class);
    }

    // Spring에서 FastAPI 맞춤추천 API를 호출하고 JSON 결과를 받는 메서드임
    public Map<String, Object> recommend(Map<String, Object> request) {
        // 맞춤추천 POST 요청을 /ml/recommendation/recommend로 보내고 Map 응답으로 변환함
        return restClient.post()
                .uri("/ml/recommendation/recommend")
                .body(request)
                .retrieve()
                .body(new ParameterizedTypeReference<Map<String, Object>>() {});
    }

    // Spring에서 adminCode(행정동 코드)를 받아 FastAPI 행정동 분석 API를 호출하고 결과 JSON을 반환하는 메서드임
    public Map<String, Object> neighborhood(String adminCode) {
        // 행정동 분석 GET 요청을 /ml/neighborhood/{adminCode}로 보내고 Map 응답으로 변환함
        return restClient.get()
                .uri("/ml/neighborhood/{adminCode}", adminCode)
                .retrieve()
                .body(new ParameterizedTypeReference<Map<String, Object>>() {});
    }

    // Spring에서 FastAPI 관리자 ML 상태 API를 호출하는 메서드임
    public Map<String, Object> adminStatus() {
        // 관리자 ML 상태 GET 요청을 /ml/admin/status로 보내고 Map 응답으로 변환함
        return restClient.get()
                .uri("/ml/admin/status")
                .retrieve()
                .body(new ParameterizedTypeReference<Map<String, Object>>() {});
    }
}