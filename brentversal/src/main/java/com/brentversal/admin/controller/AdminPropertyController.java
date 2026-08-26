package com.brentversal.admin.controller;

import com.brentversal.admin.dto.AdminPropertyDto;
import com.brentversal.admin.service.AdminPropertyService;
import com.brentversal.editrequest.dto.PropertyEditRequestCreateDto;
import com.brentversal.editrequest.dto.PropertyEditRequestDto;
import com.brentversal.editrequest.service.PropertyEditRequestService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.brentversal.property.constant.PriceEvaluationStatus;

import java.security.Principal;
import java.util.List;
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

    // 매물 상세의 "수정 요청" 에서 쓴다. 요청 자체는 editrequest 도메인이 갖고 있고,
    // 관리자 화면에서 부르는 입구만 이 컨트롤러에 둔다(권한이 /admin/** 로 이미 막혀 있어서다).
    private final PropertyEditRequestService propertyEditRequestService ;

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

    // 등록 취소 (어떤 상태의 매물이든 관리자가 내림)
    // PATCH /admin/properties/12/cancel
    //
    // 반려(reject)와 결과는 같지만 대상이 다르다.
    //   반려   : 승인 대기 매물을 게시하지 않기로 하는 것
    //   등록취소 : 이미 게시 중인 매물을 관리자가 내리는 것
    // 되돌릴 수 없으므로 화면에서 한 번 더 확인한 뒤 호출한다.
    @PatchMapping("/{id}/cancel")
    public ResponseEntity<?> cancel(@PathVariable Long id){
        try {
            AdminPropertyDto saved = adminPropertyService.cancel(id);

            return ResponseEntity.ok(Map.of("message", "매물 등록을 취소했습니다.", "property", saved));

        } catch (IllegalArgumentException e) {
            return notFound(e);
        } catch (IllegalStateException e) {
            // 임시저장처럼 관리자가 취소할 수 없는 상태
            return conflict(e);
        }
    }

    // 수정 요청 보내기 (관리자 -> 매물을 등록한 중개인)
    // POST /admin/properties/12/edit-request  { "reason": "..." }
    //
    // 반려는 되돌릴 수 없어서, 사진이 부족한 정도의 문제까지 반려로 처리하면 중개인이
    // 매물을 새로 올려야 한다. 매물은 그대로 두고 고칠 점만 알리는 통로가 이 API 다.
    @PostMapping("/{id}/edit-request")
    public ResponseEntity<?> createEditRequest(@PathVariable Long id,
                                               @Valid @RequestBody PropertyEditRequestCreateDto dto,
                                               Principal principal){
        try {
            PropertyEditRequestDto saved =
                    propertyEditRequestService.create(id, principal.getName(), dto.getReason());

            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(Map.of("message", "수정 요청을 보냈습니다.", "editRequest", saved));

        } catch (IllegalArgumentException e) {
            return notFound(e);
        } catch (IllegalStateException e) {
            return conflict(e);
        }
    }

    // 매물 1건의 수정 요청 이력
    // GET /admin/properties/12/edit-requests
    @GetMapping("/{id}/edit-requests")
    public ResponseEntity<List<PropertyEditRequestDto>> editRequests(@PathVariable Long id){
        return ResponseEntity.ok(propertyEditRequestService.findByProperty(id));
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

    // 행정동이 비어 있는 기존 매물을 좌표로 판정해 채운다.
    // POST /admin/properties/backfill-admin-code
    //
    // 매물을 등록·수정하면 행정동이 자동으로 저장되므로, 이 기능은 그 전에 등록된
    // 매물에만 필요하다. 여러 번 실행해도 이미 채운 매물은 대상에서 빠진다.
    @PostMapping("/backfill-admin-code")
    public ResponseEntity<?> backfillAdminCode(){
        try {
            return ResponseEntity.ok(adminPropertyService.backfillAdminCode());
        } catch (IllegalStateException e) {
            return badRequest(e);
        }
    }

    private ResponseEntity<Map<String, String>> badRequest(Exception e){
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", e.getMessage()));
    }

    private ResponseEntity<Map<String, String>> conflict(Exception e){
        return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", e.getMessage()));
    }
}
