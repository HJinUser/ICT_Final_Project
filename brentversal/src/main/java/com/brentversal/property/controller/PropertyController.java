package com.brentversal.property.controller;

import com.brentversal.property.constant.PropertyStatus;
import com.brentversal.property.dto.PropertyResponseDto;
import com.brentversal.property.entity.Property;
import com.brentversal.property.service.PropertyService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
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

    // 매물 비교 (쉼표로 구분된 id들을 받아서 여러 건 조회)
    @GetMapping("/compare")
    public ResponseEntity<List<PropertyResponseDto>> compare(@RequestParam String ids) {
        // "1,2,3" 형태의 문자열을 쉼표 기준으로 잘라서 Long 리스트로 변환
        List<Long> idList = new ArrayList<>();
        for (String idStr : ids.split(",")) {
            idList.add(Long.parseLong(idStr));
        }

        return ResponseEntity.ok(propertyService.findByIds(idList));
    }

    // 매물 수정 (내 사무소의 매물만 가능)
    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @Valid @RequestBody Property bean,
                                    BindingResult bindingResult, Principal principal) {
        if (bindingResult.hasErrors()) {
            Map<String, String> errors = new HashMap<>();
            for (FieldError error : bindingResult.getFieldErrors()) {
                errors.put(error.getField(), error.getDefaultMessage());
            }
            return new ResponseEntity<>(errors, HttpStatus.BAD_REQUEST);
        }
        try {
            return ResponseEntity.ok(propertyService.update(id, bean, principal.getName()));
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