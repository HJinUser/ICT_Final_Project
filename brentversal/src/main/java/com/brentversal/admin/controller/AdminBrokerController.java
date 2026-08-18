package com.brentversal.admin.controller;

import com.brentversal.admin.dto.AdminBrokerDto;
import com.brentversal.admin.service.AdminBrokerService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

// 관리자 "중개인 인증" 화면에서 쓰는 API
//
// 이 경로(/admin/**)는 SecurityConfig 에서 관리자(ROLE_ADMIN)만 통과하도록 막아 두었다.
@RestController
@RequestMapping("/admin/brokers")
@RequiredArgsConstructor
public class AdminBrokerController {
    private final AdminBrokerService adminBrokerService ;

    // 인증 신청 목록
    // GET /admin/brokers?status=PENDING&page=0
    // status 를 빼거나 ALL 을 주면 전체를 보여 준다.
    @GetMapping
    public ResponseEntity<?> list(@RequestParam(defaultValue = "PENDING") String status,
                                  @RequestParam(defaultValue = "0") int page){
        try {
            Page<AdminBrokerDto> result = adminBrokerService.getBrokers(status, page);

            return ResponseEntity.ok(Map.of(
                    "content", result.getContent(),
                    "page", result.getNumber(),
                    "totalPages", result.getTotalPages(),
                    "totalCount", result.getTotalElements(),
                    "pendingCount", adminBrokerService.countPending()));

        } catch (IllegalArgumentException e) {
            return badRequest(e);
        }
    }

    // 승인 (심사 중 -> 인증 완료). 중개사무소에 인증 마크가 붙는다.
    // PATCH /admin/brokers/3/approve
    @PatchMapping("/{id}/approve")
    public ResponseEntity<?> approve(@PathVariable Long id){
        try {
            AdminBrokerDto saved = adminBrokerService.approve(id);

            return ResponseEntity.ok(Map.of("message", "인증을 승인했습니다.", "broker", saved));

        } catch (IllegalArgumentException e) {
            return notFound(e);
        } catch (IllegalStateException e) {
            // 이미 승인·반려된 신청을 다시 처리하려는 경우
            return conflict(e);
        }
    }

    // 반려 (심사 중 -> 미인증). 사유를 남기면 중개인 화면에 그대로 보인다.
    // PATCH /admin/brokers/3/reject   본문: { "reason": "자격증 사진이 흐려 확인이 어렵습니다." }
    @PatchMapping("/{id}/reject")
    public ResponseEntity<?> reject(@PathVariable Long id, @RequestBody Map<String, String> request){
        try {
            AdminBrokerDto saved = adminBrokerService.reject(id, request.get("reason"));

            return ResponseEntity.ok(Map.of("message", "인증 신청을 반려했습니다.", "broker", saved));

        } catch (IllegalArgumentException e) {
            return badRequest(e);
        } catch (IllegalStateException e) {
            return conflict(e);
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
