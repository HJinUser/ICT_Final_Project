package com.brentversal.agency.controller;

import com.brentversal.agency.dto.MyConsultationDto;
import com.brentversal.agency.service.MemberConsultationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.Map;

// 사용자가 자기가 보낸 상담과 받은 답변을 확인하는 API
//
// 로그인이 필요한 경로다 (SecurityConfig 의 anyRequest().authenticated() 에 걸린다).
// 사무소 쪽 화면(/my-agency/**)과 달리 역할 제한은 없다. 상담은 누구나 보낼 수 있고,
// 보낸 사람은 자기 상담을 볼 수 있어야 하기 때문이다.
@RestController
@RequestMapping("/my-consultations")
@RequiredArgsConstructor
public class MemberConsultationController {
    private final MemberConsultationService memberConsultationService ;

    // 내가 보낸 상담 목록 (최신순)
    // GET /my-consultations
    @GetMapping
    public ResponseEntity<?> list(Principal principal){
        try {
            List<MyConsultationDto> list = memberConsultationService.getMyConsultations(principal.getName());

            return ResponseEntity.ok(Map.of("content", list, "totalCount", list.size()));

        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", e.getMessage()));
        }
    }

    // 답변 확인 처리
    // PATCH /my-consultations/3/check
    // 화면에서 답변을 펼쳐 볼 때 부른다. 이 시점부터 헤더 알림에서 사라진다.
    @PatchMapping("/{id}/check")
    public ResponseEntity<?> check(@PathVariable Long id, Principal principal){
        try {
            MyConsultationDto saved = memberConsultationService.checkReply(principal.getName(), id);

            return ResponseEntity.ok(Map.of("message", "답변을 확인했습니다.", "consultation", saved));

        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", e.getMessage()));
        }
    }
}
