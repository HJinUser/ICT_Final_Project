package com.brentversal.admin.controller;

import com.brentversal.admin.dto.AdminPropertyDto;
import com.brentversal.admin.service.AdminPropertyService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.brentversal.property.constant.PriceEvaluationStatus;

import java.util.Map;

// 관리자 "매물 관리" 화면에서 쓰는 API
//
// 이 경로(/admin/**)는 SecurityConfig 에서 관리자(ROLE_ADMIN)만 통과하도록 막아 두었다.
// 그래서 각 메소드에서 다시 권한을 확인하지 않는다.
@RestController
@RequestMapping("/admin/properties")
@RequiredArgsConstructor
public class AdminPropertyController {
    private final AdminPropertyService adminPropertyService ;

    // 매물 목록
    // GET /admin/properties?status=PENDING&page=0
    // status 를 빼거나 ALL 을 주면 전체를 보여 준다.
    //
    // 목록과 함께 승인 대기 건수도 내려 준다. 화면 상단 요약에 쓰이고,
    // 승인·반려 후 목록을 다시 불러올 때 숫자도 같이 갱신되도록 하기 위해서다.
    @GetMapping
    public ResponseEntity<?> list(@RequestParam(defaultValue = "PENDING") String status,
                                  @RequestParam(defaultValue = "0") int page){
        try {
            Page<AdminPropertyDto> result = adminPropertyService.getProperties(status, page);

            return ResponseEntity.ok(Map.of(
                    "content", result.getContent(),
                    "page", result.getNumber(),
                    "totalPages", result.getTotalPages(),
                    "totalCount", result.getTotalElements(),
                    "pendingCount", adminPropertyService.countPending()));

        } catch (IllegalArgumentException e) {
            return badRequest(e);
        }
    }

    // 요청으로 받은 가격평가 문자열을 Enum으로 검증한 뒤 Service에 저장을 요청하는 Controller 메서드임
    @PatchMapping("/{id}/price-evaluation")
    public ResponseEntity<?> evaluatePrice(
            @PathVariable Long id,
            @RequestBody Map<String, String> request
    ) {
        String value = request.get("status");

        // 현재 값/권한/상태가 조건을 만족하는지 확인함
        if (value == null || value.isBlank()) {
            // 잘못된 요청 내용을 HTTP 400 응답으로 반환함
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "가격 평가값이 필요합니다."));
        }

        final PriceEvaluationStatus evaluation;

        // 외부 호출/변환 중 오류가 날 수 있어 예외 처리 범위로 묶어둠
        try {
            evaluation = PriceEvaluationStatus.valueOf(value.toUpperCase());
        } catch (IllegalArgumentException e) {
            // 잘못된 요청 내용을 HTTP 400 응답으로 반환함
            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "가격 평가는 UNDERVALUED, FAIR, OVERVALUED 중 하나여야 합니다."
                    ));
        }

        // 외부 호출/변환 중 오류가 날 수 있어 예외 처리 범위로 묶어둠
        try {
            AdminPropertyDto saved =
                    adminPropertyService.evaluatePrice(id, evaluation);

            // 정상 처리 결과를 HTTP 200 응답으로 반환함
            return ResponseEntity.ok(Map.of(
                    "message", "가격 평가를 저장했습니다.",
                    "property", saved
            ));
        } catch (IllegalArgumentException e) {
            // 평가 대상 매물을 찾지 못한 오류를 기존 404 응답 Helper로 변환함
            return notFound(e);
        } catch (IllegalStateException e) {
            // 평가할 수 없는 매물 상태 오류를 기존 409 Conflict 응답 Helper로 변환함
            return conflict(e);
        }
    }

    // 승인 (승인 대기 -> 게시중)
    // PATCH /admin/properties/12/approve
    @PatchMapping("/{id}/approve")
    public ResponseEntity<?> approve(@PathVariable Long id){
        try {
            AdminPropertyDto saved = adminPropertyService.approve(id);

            return ResponseEntity.ok(Map.of("message", "매물을 승인했습니다.", "property", saved));

        } catch (IllegalArgumentException e) {
            return notFound(e);
        } catch (IllegalStateException e) {
            // 이미 승인·반려된 매물을 다시 처리하려는 경우
            return conflict(e);
        }
    }

    // 반려 (승인 대기 -> 등록 취소)
    // PATCH /admin/properties/12/reject
    @PatchMapping("/{id}/reject")
    public ResponseEntity<?> reject(@PathVariable Long id){
        try {
            AdminPropertyDto saved = adminPropertyService.reject(id);

            return ResponseEntity.ok(Map.of("message", "매물을 반려했습니다.", "property", saved));

        } catch (IllegalArgumentException e) {
            return notFound(e);
        } catch (IllegalStateException e) {
            return conflict(e);
        }
    }

    // 비공개 처리
// PATCH /admin/properties/12/hide
    @PatchMapping("/{id}/hide")
    public ResponseEntity<?> hide(@PathVariable Long id){
        try {
            AdminPropertyDto saved = adminPropertyService.hide(id);
            return ResponseEntity.ok(Map.of("message", "매물을 비공개 처리했습니다.", "property", saved));
        } catch (IllegalArgumentException e) {
            return notFound(e);
        }
    }

    // 공개 처리
    // PATCH /admin/properties/12/unhide
    @PatchMapping("/{id}/unhide")
    public ResponseEntity<?> unhide(@PathVariable Long id){
        try {
            AdminPropertyDto saved = adminPropertyService.unhide(id);
            return ResponseEntity.ok(Map.of("message", "매물을 다시 공개했습니다.", "property", saved));
        } catch (IllegalArgumentException e) {
            return notFound(e);
        }
    }

    // 아래 세 메소드는 오류 응답 형태를 통일하려고 따로 뺐다.
    private ResponseEntity<Map<String, String>> notFound(Exception e){
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", e.getMessage()));
    }

    private ResponseEntity<Map<String, String>> badRequest(Exception e){
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", e.getMessage()));
    }

    private ResponseEntity<Map<String, String>> conflict(Exception e){
        return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", e.getMessage()));
    }
}
