package com.brentversal.notice.controller;

import com.brentversal.notice.dto.NoticeCreateRequest;
import com.brentversal.notice.dto.NoticeResponse;
import com.brentversal.notice.dto.NoticeUpdateRequest;
import com.brentversal.notice.service.NoticeService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/notices")
public class NoticeApiController {

    private final NoticeService noticeService;

    public NoticeApiController(NoticeService noticeService) {
        this.noticeService = noticeService;
    }

    @GetMapping
    public ResponseEntity<List<NoticeResponse>> findAll() {
        return ResponseEntity.ok(noticeService.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<NoticeResponse> findById(@PathVariable Long id) {
        return ResponseEntity.ok(noticeService.findById(id));
    }

    @PostMapping
    public ResponseEntity<NoticeResponse> create(
            @Valid @RequestBody NoticeCreateRequest request,
            Authentication authentication
    ) {
        NoticeResponse response = noticeService.create(
                request,
                authentication.getName()
        );

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(response);
    }

    @PutMapping("/{id}")
    public ResponseEntity<NoticeResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody NoticeUpdateRequest request
    ) {
        return ResponseEntity.ok(noticeService.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        noticeService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
