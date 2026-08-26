package com.brentversal.editrequest.controller;

import com.brentversal.agency.service.MyAgencyService;
import com.brentversal.editrequest.dto.PropertyEditRequestDto;
import com.brentversal.editrequest.service.PropertyEditRequestService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;
import java.util.List;
import java.util.Map;

// 중개인이 자기 사무소로 들어온 "매물 수정 요청" 을 확인하는 API
//
// 이 경로(/my-agency/**)는 SecurityConfig 에서 중개인(ROLE_BROKER)만 통과하도록 막아 두었다.
// 사무소 번호를 주소로 받지 않는 이유는 다른 /my-agency 경로와 같다 —
// 로그인한 사람의 사무소를 서버가 직접 찾으므로 남의 사무소 자료를 열어 볼 수 없다.
@RestController
@RequestMapping("/my-agency/edit-requests")
@RequiredArgsConstructor
public class MyEditRequestController {

    private final PropertyEditRequestService propertyEditRequestService;
    private final MyAgencyService myAgencyService;

    // 내 사무소가 받은 수정 요청 목록
    // GET /my-agency/edit-requests?openOnly=true
    //
    // openOnly 기본값이 true 인 이유 : 중개인이 실제로 확인해야 하는 것은 아직 처리하지 않은 요청이다.
    // 지난 이력까지 보려면 openOnly=false 로 부른다.
    @GetMapping
    public ResponseEntity<?> myEditRequests(@RequestParam(defaultValue = "true") boolean openOnly,
                                            Principal principal) {
        try {
            Long agencyId = myAgencyService.findMyAgency(principal.getName()).getId();

            List<PropertyEditRequestDto> found =
                    propertyEditRequestService.findByAgency(agencyId, openOnly);

            return ResponseEntity.ok(found);

        } catch (IllegalArgumentException e) {
            // 아직 사무소를 만들지 않은 중개인 — 받은 요청도 있을 수 없다
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", e.getMessage()));
        }
    }
}
