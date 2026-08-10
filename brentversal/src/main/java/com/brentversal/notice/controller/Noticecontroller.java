package com.brentversal.notice.controller;
import com.brentversal.notice.service.NoticeService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/notices")
public class NoticeController {

    private final NoticeService noticeService;

    // 전체 조회
    @GetMapping
    public ResponseEntity<List<NoticeResponse>> findAll() {
        return ResponseEntity.ok(
                noticeService.findAll()
        );
    }

    // 상세 조회
    @GetMapping("/{id}")
    public ResponseEntity<NoticeResponse> findById(
            @PathVariable Long id
    ) {
        return ResponseEntity.ok(
                noticeService.findById(id)
        );
    }

    // 등록
    @PostMapping
    public ResponseEntity<NoticeResponse> create(
            @Valid @RequestBody
            NoticeCreateRequest request
    ) {
        NoticeResponse response =
                noticeService.create(request);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(response);
    }
    // 수정
    @PatchMapping("/{id}")
    public ResponseEntity<NoticeResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody
            NoticeUpdateRequest request
    ) {
        return ResponseEntity.ok(
                noticeService.update(id, request)
        );
    }

    // 삭제
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @PathVariable Long id
    ) {
        noticeService.delete(id);
        return ResponseEntity.noContent().build();
    }
}



















