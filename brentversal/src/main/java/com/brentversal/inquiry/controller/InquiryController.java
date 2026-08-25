package com.brentversal.inquiry.controller;

import com.brentversal.inquiry.dto.InquiryCreateRequestDto;
import com.brentversal.inquiry.service.InquiryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/inquiry")
@RequiredArgsConstructor
public class InquiryController {

    private final InquiryService inquiryService;

    @PostMapping
    public ResponseEntity<?> create(Authentication authentication,
                                    @Valid @RequestBody InquiryCreateRequestDto dto) {
        try {
            Long id = inquiryService.create(authentication.getName(), dto);
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(Map.of("message", "문의가 접수되었습니다.", "id", id));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }
}
