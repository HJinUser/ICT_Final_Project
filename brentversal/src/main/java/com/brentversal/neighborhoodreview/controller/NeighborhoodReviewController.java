package com.brentversal.neighborhoodreview.controller;

// 이 클래스에서 사용할 Java/Spring/프로젝트 타입 불러옴
import com.brentversal.neighborhoodreview.dto.NeighborhoodReviewRequestDto;
import com.brentversal.neighborhoodreview.service.NeighborhoodReviewService;
import jakarta.persistence.EntityNotFoundException;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

// 행정동 한줄평 공개 조회와 로그인 USER 작성 API를 제공하는 Controller임
@RestController
@RequestMapping("/neighborhood/reviews")
@RequiredArgsConstructor
public class NeighborhoodReviewController {

    private final NeighborhoodReviewService service;

    /*
      adminCode에 해당하는 동네 한줄평 목록을 조회해 반환하는 GET API 메서드임.

      작성자 이름은 관리자에게만 내려준다. 이 API 는 비로그인도 부를 수 있어서
      authentication 이 null 로 들어올 수 있고, isAdmin 이 그 경우를 함께 처리한다.
    */
    @GetMapping
    public ResponseEntity<?> list(
            @RequestParam String adminCode,
            Authentication authentication) {
        String viewerEmail = authentication == null ? null : authentication.getName();

        // 정상 처리 결과를 HTTP 200 응답으로 반환함
        return ResponseEntity.ok(service.findByAdminCode(adminCode, isAdmin(authentication), viewerEmail));
    }

    // 요청한 사람이 관리자인지 확인한다. 비로그인이면 authentication 이 null 이라 함께 걸러 낸다.
    private boolean isAdmin(Authentication authentication) {
        return authentication != null && authentication.getAuthorities().stream()
                .anyMatch(authority -> authority.getAuthority().equals("ROLE_ADMIN"));
    }

    // 로그인 사용자와 요청 DTO를 NeighborhoodReviewService에 넘겨 동네 한줄평을 생성·수정하는 POST API 메서드임
    @PostMapping
    public ResponseEntity<?> save(
            Authentication authentication,
            @Valid @RequestBody NeighborhoodReviewRequestDto dto) {
        // NeighborhoodReviewService의 저장·수정 결과 DTO를 HTTP 200 응답으로 반환함
        return ResponseEntity.ok(service.save(authentication.getName(), dto));
    }

    // 한줄평 수정. 본인 글만 고칠 수 있다 (Service 가 확인한다).
    @PutMapping("/{id}")
    public ResponseEntity<?> update(
            @PathVariable Long id,
            Authentication authentication,
            @Valid @RequestBody NeighborhoodReviewRequestDto dto) {
        try {
            return ResponseEntity.ok(service.update(id, authentication.getName(), dto));
        } catch (EntityNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", e.getMessage()));
        }
    }

    // 한줄평 삭제. 본인 글만 지울 수 있다 (Service 가 확인한다).
    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id, Authentication authentication) {
        try {
            service.delete(id, authentication.getName());
            return ResponseEntity.ok(Map.of("message", "한줄평을 삭제했습니다."));
        } catch (EntityNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", e.getMessage()));
        }
    }
}