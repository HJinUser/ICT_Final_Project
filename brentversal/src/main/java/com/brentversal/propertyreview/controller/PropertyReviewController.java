package com.brentversal.propertyreview.controller;

import com.brentversal.propertyreview.dto.PropertyReviewRequestDto;
import com.brentversal.propertyreview.service.PropertyReviewService;
import jakarta.persistence.EntityNotFoundException;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.Map;

/*
  매물 한줄평 API.

  목록 조회는 비회원도 볼 수 있고, 작성은 로그인한 일반 사용자만 할 수 있다.
  권한은 SecurityConfig 에서 막으므로 여기서 다시 확인하지 않는다.
*/
@RestController
@RequestMapping("/property/{propertyId}/reviews")
@RequiredArgsConstructor
public class PropertyReviewController {

    private final PropertyReviewService propertyReviewService;

    // 매물 한줄평 목록
    // 비회원도 부를 수 있어서 Principal 이 null 로 들어올 수 있다.
    @GetMapping
    public ResponseEntity<?> list(@PathVariable Long propertyId, Principal principal) {
        String email = (principal == null) ? null : principal.getName();

        try {
            return ResponseEntity.ok(propertyReviewService.findByProperty(propertyId, email));
        } catch (EntityNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", e.getMessage()));
        }
    }

    // 한줄평 작성. 같은 매물에 이미 쓴 글이 있으면 그 글을 고친다.
    @PostMapping
    public ResponseEntity<?> save(@PathVariable Long propertyId,
                                  Principal principal,
                                  @Valid @RequestBody PropertyReviewRequestDto dto) {
        String email = (principal == null) ? null : principal.getName();

        try {
            return ResponseEntity.ok(propertyReviewService.save(propertyId, email, dto));
        } catch (EntityNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", e.getMessage()));
        }
    }
}
