package com.brentversal.property.controller;

import com.brentversal.favorite.service.FavoriteService;
import com.brentversal.property.constant.PropertyStatus;
import com.brentversal.property.dto.PropertyResponseDto;
import com.brentversal.property.dto.PropertySearchCondition;
import com.brentversal.property.dto.PropertySearchDto;
import com.brentversal.property.entity.Property;
import com.brentversal.property.service.PropertyService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.validation.BindingResult;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.security.Principal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/property")
@RequiredArgsConstructor
public class PropertyController {

    private final PropertyService propertyService;
    private final FavoriteService favoriteService;

    // 매물 등록
    //
    // Principal : 시큐리티가 넣어 주는 로그인 사용자 정보(JwtAuthenticationFilter 가 이메일을 담아 둔다).
    // 어느 사무소의 매물인지는 이 값으로 서버가 정한다. 요청 본문의 agency 는 쓰지 않는다.
    @PostMapping(value = "/insert", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> insert(@Valid @RequestPart("data") Property bean,
                                    BindingResult bindingResult,
                                    @RequestPart(value = "files", required = false) List<MultipartFile> files,
                                    Principal principal){
        if (bindingResult.hasErrors()) {
            Map<String, String> errors = new HashMap<>();
            for (FieldError error : bindingResult.getFieldErrors()) {
                errors.put(error.getField(), error.getDefaultMessage());
            }
            return new ResponseEntity<>(errors, HttpStatus.BAD_REQUEST);
        }

        // 거래유형에 맞는 가격 필드가 채워졌는지 확인 (Bean Validation만으로는 표현 못 하는 조건)
        Map<String, String> pricingErrors = propertyService.validatePricingFields(bean);
        if (!pricingErrors.isEmpty()) {
            return new ResponseEntity<>(pricingErrors, HttpStatus.BAD_REQUEST);
        }

        try {
            PropertyResponseDto saved = propertyService.insert(bean, files, principal.getName());
            return new ResponseEntity<>(saved, HttpStatus.OK);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", e.getMessage()));
        }
    }

    // 매물 상세 조회
    @GetMapping("/{id}")
    public ResponseEntity<?> findById(@PathVariable Long id) {
        Optional<PropertyResponseDto> found = propertyService.findById(id);

        if (found.isPresent()) {
            return ResponseEntity.ok(found.get());
        } else {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "해당 매물을 찾을 수 없습니다."));
        }
    }

    // 지도 검색 (왼쪽 필터 + 가운데 지도 + 오른쪽 목록이 함께 쓰는 조회)
    // GET /property/search?region=서초구&dealType=JEONSE&minPrice=0&maxPrice=50000&sort=PRICE_ASC
    //
    // 비회원도 쓸 수 있는 화면이라 로그인을 요구하지 않는다(GET /property/** 는 permitAll).
    // 다만 중개인이 "내 매물"만 볼 때는 누구인지 알아야 해서, 로그인했으면 이메일을 함께 넘긴다.
    @GetMapping("/search")
    public ResponseEntity<Map<String, Object>> search(PropertySearchCondition condition, Principal principal) {
        String email = (principal == null) ? null : principal.getName();

        List<PropertySearchDto> found = propertyService.search(condition, email);

        return ResponseEntity.ok(Map.of("content", found, "totalCount", found.size()));
    }

    // 매물 비교 (쉼표로 구분된 id들을 받아서 여러 건 조회)
    @GetMapping("/compare")
    public ResponseEntity<?> compare(@RequestParam String ids) {
        try {
            List<Long> idList = new ArrayList<>();

            for (String idStr : ids.split(",")) {
                idList.add(Long.parseLong(idStr.trim()));
            }

            return ResponseEntity.ok(propertyService.compareProperties(idList));

        } catch (NumberFormatException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "매물 id 형식이 올바르지 않습니다."));

        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", e.getMessage()));
        }
    }

    // 관심매물 토글 (로그인 필요 — SecurityConfig에서 이 경로는 인증 요구)
    @PostMapping("/{id}/favorite")
    public ResponseEntity<?> toggleFavorite(@PathVariable Long id, Authentication authentication) {
        try {
            boolean favorited = favoriteService.toggle(authentication.getName(), id);
            return ResponseEntity.ok(Map.of("favorited", favorited));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", e.getMessage()));
        }
    }

    // 로그인한 회원의 관심매물 목록 (관심목록 화면용)
    @GetMapping("/favorites")
    public ResponseEntity<?> myFavorites(Authentication authentication) {
        try {
            return ResponseEntity.ok(favoriteService.findFavoriteProperties(authentication.getName()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", e.getMessage()));
        }
    }

    // 로그인한 중개인이 등록한 매물 전체 조회 ("내 매물" 화면용)
    @GetMapping("/mine")
    public ResponseEntity<?> mine(Principal principal) {
        try {
            return ResponseEntity.ok(propertyService.findMine(principal.getName()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", e.getMessage()));
        }
    }

    // 매물 수정 (내 사무소의 매물만 가능)
    @PutMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> update(@PathVariable Long id,
                                    @Valid @RequestPart("data") Property bean,
                                    BindingResult bindingResult,
                                    @RequestPart(value = "files", required = false) List<MultipartFile> files,
                                    Principal principal) {
        if (bindingResult.hasErrors()) {
            Map<String, String> errors = new HashMap<>();
            for (FieldError error : bindingResult.getFieldErrors()) {
                errors.put(error.getField(), error.getDefaultMessage());
            }
            return new ResponseEntity<>(errors, HttpStatus.BAD_REQUEST);
        }
        try {
            return ResponseEntity.ok(propertyService.update(id, bean, files, principal.getName()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", e.getMessage()));
        }
    }

    // 거래 상태 변경 (게시중/거래진행중/거래완료)
    @PatchMapping("/{id}/status")
    public ResponseEntity<?> updateStatus(@PathVariable Long id, @RequestBody Map<String, String> request,
                                          Principal principal){
        try{
            PropertyStatus newStatus = PropertyStatus.valueOf(request.get("status"));
            return ResponseEntity.ok(propertyService.updateStatus(id, newStatus, principal.getName()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", e.getMessage()));
        }
    }

    // 등록 취소
    @PatchMapping("/{id}/cancel")
    public ResponseEntity<?> cancel(@PathVariable Long id, Principal principal) {
        try {
            return ResponseEntity.ok(propertyService.cancel(id, principal.getName()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", e.getMessage()));
        }
    }

    // 공개/비공개 전환
    @PatchMapping("/{id}/visibility")
    public ResponseEntity<?> toggleVisibility(@PathVariable Long id, Principal principal) {
        try {
            return ResponseEntity.ok(propertyService.toggleVisibility(id, principal.getName()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", e.getMessage()));
        }
    }
}