package com.brentversal.neighborhoodreview.controller;

// 이 클래스에서 사용할 Java/Spring/프로젝트 타입 불러옴
import com.brentversal.neighborhoodreview.dto.NeighborhoodReviewRequestDto;
import com.brentversal.neighborhoodreview.service.NeighborhoodReviewService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

// 행정동 한줄평 공개 조회와 로그인 USER 작성 API를 제공하는 Controller임
@RestController
@RequestMapping("/neighborhood/reviews")
@RequiredArgsConstructor
public class NeighborhoodReviewController {

    private final NeighborhoodReviewService service;

    // adminCode에 해당하는 동네 한줄평 목록을 조회해 반환하는 GET API 메서드임
    @GetMapping
    public ResponseEntity<?> list(@RequestParam String adminCode) {
        // 정상 처리 결과를 HTTP 200 응답으로 반환함
        return ResponseEntity.ok(service.findByAdminCode(adminCode));
    }

    // 로그인 사용자와 요청 DTO를 NeighborhoodReviewService에 넘겨 동네 한줄평을 생성·수정하는 POST API 메서드임
    @PostMapping
    public ResponseEntity<?> save(
            Authentication authentication,
            @Valid @RequestBody NeighborhoodReviewRequestDto dto) {
        // NeighborhoodReviewService의 저장·수정 결과 DTO를 HTTP 200 응답으로 반환함
        return ResponseEntity.ok(service.save(authentication.getName(), dto));
    }
}