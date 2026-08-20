package com.brentversal.neighborhood.controller;

import com.brentversal.common.ml.MlClient;
import com.brentversal.neighborhood.dto.NeighborhoodCreateRequest;
import com.brentversal.neighborhood.dto.NeighborhoodListResponse;
import com.brentversal.neighborhood.dto.NeighborhoodResponse;
import com.brentversal.neighborhood.dto.NeighborhoodSearchRequest;
import com.brentversal.neighborhood.service.NeighborhoodService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/neighborhoods")
@RequiredArgsConstructor
public class NeighborhoodController {

    private final NeighborhoodService neighborhoodService;
    // React가 FastAPI를 직접 부르지 않도록, 행정동 ML 분석 결과를 이 서버가 대신 받아 전달한다.
    private final MlClient mlClient;

    @GetMapping
    public NeighborhoodListResponse list(
            @ModelAttribute NeighborhoodSearchRequest request,
            Authentication authentication
    ) {
        return neighborhoodService.search(request, isAdmin(authentication));
    }

    @GetMapping("/{id}")
    public NeighborhoodResponse detail(
            @PathVariable Long id,
            Authentication authentication
    ) {
        return neighborhoodService.findById(id, isAdmin(authentication));
    }

    @PatchMapping("/{id}/visibility")
    public NeighborhoodResponse toggleVisibility(@PathVariable Long id) {
        return neighborhoodService.toggleVisibility(id);
    }

    // 관리자 "동네 등록". SecurityConfig에서 ADMIN만 호출 가능하도록 막아 둔다.
    @PostMapping
    public ResponseEntity<?> create(@Valid @RequestBody NeighborhoodCreateRequest request) {
        try {
            return ResponseEntity.status(HttpStatus.CREATED).body(neighborhoodService.create(request));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    private boolean isAdmin(Authentication authentication) {
        return authentication != null && authentication.getAuthorities().stream()
                .anyMatch(authority -> authority.getAuthority().equals("ROLE_ADMIN"));
    }

    /*
      행정동 K-Means 분석 결과를 돌려준다.

      adminCode 는 통계청 행정동 코드이고, 위의 /{id} 가 쓰는 Neighborhood.id(법정동)와는
      코드 체계가 다르다. 둘을 서로 바꿔 넣으면 안 된다.
      경로가 "/ml/{adminCode}" 두 마디라서 한 마디인 /{id} 와는 애초에 겹치지 않는다.
      SecurityConfig 의 GET /neighborhoods/** permitAll 에 이미 포함되어 비회원도 볼 수 있다.
    */
    @GetMapping("/ml/{adminCode}")
    public ResponseEntity<?> mlDetail(@PathVariable String adminCode) {
        return ResponseEntity.ok(mlClient.neighborhood(adminCode));
    }
}
