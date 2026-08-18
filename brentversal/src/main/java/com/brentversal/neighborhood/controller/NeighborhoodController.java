package com.brentversal.neighborhood.controller;

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
}
