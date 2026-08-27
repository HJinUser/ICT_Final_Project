package com.brentversal.admin.controller;

import com.brentversal.admin.dto.MemberStatsDto;
import com.brentversal.admin.service.AdminMemberService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

// 관리자 홈 "회원 통계" 에서 쓰는 API
//
// 이 경로(/admin/**)는 SecurityConfig 에서 관리자(ROLE_ADMIN)만 통과하도록 막아 두었다.
// 그래서 여기서 다시 권한을 확인하지 않는다.
@RestController
@RequestMapping("/admin/members")
@RequiredArgsConstructor
public class AdminMemberController {

    private final AdminMemberService adminMemberService;

    // 전체 회원 수 · 이번 달 신규 가입 · 역할 비중 · 월별 가입 추이
    // GET /admin/members/stats
    @GetMapping("/stats")
    public ResponseEntity<MemberStatsDto> stats() {
        return ResponseEntity.ok(adminMemberService.getStats());
    }
}
