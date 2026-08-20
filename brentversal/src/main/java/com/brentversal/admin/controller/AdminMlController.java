package com.brentversal.admin.controller;

// 이 클래스에서 사용할 Java/Spring/프로젝트 타입 불러옴
import com.brentversal.common.ml.MlClient;
import com.brentversal.recommendation.service.RecommendationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Map;

// FastAPI 오프라인 ML 메타데이터와 Spring 추천 통계를 합쳐 관리자에게 제공하는 Controller임
@RestController
@RequestMapping("/admin/ml")
@RequiredArgsConstructor
public class AdminMlController {

    private final MlClient mlClient;
    private final RecommendationService recommendationService;

    // FastAPI 오프라인 ML 상태와 Spring 추천 통계를 합쳐 관리자 화면용 응답으로 반환하는 API 메서드임
    @GetMapping("/status")
    public ResponseEntity<?> status() {
        Map<String, Object> result = new LinkedHashMap<>();

        // Spring에서 FastAPI ML 상태 API를 호출함
        result.put("offline", mlClient.adminStatus());

        result.put("recommendation", recommendationService.adminMetrics());

        // 정상 처리 결과를 HTTP 200 응답으로 반환함
        return ResponseEntity.ok(result);
    }
}