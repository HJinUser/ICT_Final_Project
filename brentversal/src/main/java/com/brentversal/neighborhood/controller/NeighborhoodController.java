package com.brentversal.neighborhood.controller;

import com.brentversal.neighborhood.dto.NeighborhoodListResponse;
import com.brentversal.neighborhood.dto.NeighborhoodResponse;
import com.brentversal.neighborhood.dto.NeighborhoodSearchRequest;
import com.brentversal.neighborhood.service.NeighborhoodService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

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

    private boolean isAdmin(Authentication authentication) {
        return authentication != null && authentication.getAuthorities().stream()
                .anyMatch(authority -> authority.getAuthority().equals("ROLE_ADMIN"));
    }
}
