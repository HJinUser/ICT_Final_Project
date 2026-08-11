package com.brentversal.agency.controller;

import com.brentversal.agency.dto.AgencyDetailDto;
import com.brentversal.agency.dto.AgencyReviewDto;
import com.brentversal.agency.dto.ConsultationResponseDto;
import com.brentversal.agency.dto.MyAgencyDashboardDto;
import com.brentversal.agency.dto.MyPropertyCardDto;
import com.brentversal.agency.dto.NotificationDto;
import com.brentversal.agency.service.AgencyService;
import com.brentversal.agency.service.MyAgencyService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.Map;

// 중개인 전용 화면("내 중개사무소", 중개인 마이페이지, 답변하기)에서 쓰는 API
//
// 이 경로(/my-agency/**)는 SecurityConfig 에서 중개인(ROLE_BROKER)만 통과하도록 막아 두었다.
// 그래서 각 메소드에서 다시 권한을 확인할 필요가 없고, 대신 "내 사무소가 맞는지"만 서비스에서 확인한다.
//
// 사무소 id 를 주소에 넣지 않는 이유:
// 로그인한 사람의 사무소를 서버가 직접 찾기 때문에, 남의 사무소 번호를 넣어 열어 보는 일이 생길 수 없다.
@RestController
@RequestMapping("/my-agency")
@RequiredArgsConstructor
public class MyAgencyController {
    private final MyAgencyService myAgencyService ;
    private final AgencyService agencyService ;

    // 내 중개사무소 정보 (사무소 정보 탭)
    // GET /my-agency
    @GetMapping
    public ResponseEntity<?> myAgency(Principal principal){
        try {
            // 상세 페이지와 똑같은 내용을 보여 줘야 하므로 같은 DTO 를 재사용한다
            Long agencyId = myAgencyService.findMyAgency(principal.getName()).getId();

            return ResponseEntity.ok(agencyService.findDetailById(agencyId).orElseThrow());

        } catch (IllegalArgumentException e) {
            return notFound(e);
        }
    }

    // 사무소 정보 수정 (수정 모드에서 저장)
    // PUT /my-agency
    @PutMapping
    public ResponseEntity<?> updateMyAgency(@RequestBody AgencyDetailDto dto, Principal principal){
        try {
            AgencyDetailDto saved = myAgencyService.updateMyAgency(principal.getName(), dto);

            return ResponseEntity.ok(Map.of("message", "사무소 정보를 저장했습니다.", "agency", saved));

        } catch (IllegalArgumentException e) {
            return badRequest(e);
        }
    }

    // 상단 요약(대시보드) 숫자
    // GET /my-agency/dashboard
    @GetMapping("/dashboard")
    public ResponseEntity<?> dashboard(Principal principal){
        try {
            MyAgencyDashboardDto dto = myAgencyService.getDashboard(principal.getName());

            return ResponseEntity.ok(dto);

        } catch (IllegalArgumentException e) {
            return notFound(e);
        }
    }

    // 내가 등록한 매물 목록 (한 페이지 6개 = 2행 3열)
    // GET /my-agency/properties?page=0
    @GetMapping("/properties")
    public ResponseEntity<?> myProperties(@RequestParam(defaultValue = "0") int page, Principal principal){
        try {
            Page<MyPropertyCardDto> result = myAgencyService.getMyProperties(principal.getName(), page);

            // Page 객체를 그대로 내보내면 필드가 너무 많아 프론트가 다루기 번거로우므로 필요한 것만 담는다
            return ResponseEntity.ok(Map.of(
                    "content", result.getContent(),
                    "page", result.getNumber(),          // 현재 페이지 (0부터)
                    "totalPages", result.getTotalPages(),// 전체 페이지 수
                    "totalCount", result.getTotalElements()));

        } catch (IllegalArgumentException e) {
            return notFound(e);
        }
    }

    // 문의(상담) 목록
    // GET /my-agency/consultations?status=WAITING
    // status 를 빼거나 ALL 을 주면 전체를 보여 준다.
    @GetMapping("/consultations")
    public ResponseEntity<?> consultations(@RequestParam(required = false) String status, Principal principal){
        try {
            List<ConsultationResponseDto> list = myAgencyService.getMyConsultations(principal.getName(), status);

            return ResponseEntity.ok(list);

        } catch (IllegalArgumentException e) {
            return badRequest(e);
        }
    }

    // 문의 1건 (답변하기 페이지)
    // GET /my-agency/consultations/3
    @GetMapping("/consultations/{id}")
    public ResponseEntity<?> consultation(@PathVariable Long id, Principal principal){
        try {
            return ResponseEntity.ok(myAgencyService.getMyConsultation(principal.getName(), id));

        } catch (IllegalArgumentException e) {
            return notFound(e);
        }
    }

    // 답변 보내기
    // POST /my-agency/consultations/3/reply   본문: { "reply": "안녕하세요..." }
    @PostMapping("/consultations/{id}/reply")
    public ResponseEntity<?> replyConsultation(@PathVariable Long id,
                                               @RequestBody Map<String, String> request,
                                               Principal principal){
        try {
            ConsultationResponseDto saved =
                    myAgencyService.replyToConsultation(principal.getName(), id, request.get("reply"));

            return ResponseEntity.ok(Map.of("message", "답변을 보냈습니다.", "consultation", saved));

        } catch (IllegalArgumentException e) {
            return badRequest(e);
        }
    }

    // 상담 상태 변경 (상담 완료 / 종료 처리)
    // PATCH /my-agency/consultations/3/status   본문: { "status": "DONE" }
    @PatchMapping("/consultations/{id}/status")
    public ResponseEntity<?> updateConsultationStatus(@PathVariable Long id,
                                                      @RequestBody Map<String, String> request,
                                                      Principal principal){
        try {
            ConsultationResponseDto saved =
                    myAgencyService.updateConsultationStatus(principal.getName(), id, request.get("status"));

            return ResponseEntity.ok(Map.of(
                    "message", saved.getStatusLabel() + " 상태로 변경했습니다.",
                    "consultation", saved));

        } catch (IllegalArgumentException e) {
            return badRequest(e);
        }
    }

    // 리뷰 목록 (리뷰 관리 탭, 한 페이지 10개)
    // GET /my-agency/reviews?filter=UNANSWERED&page=0
    @GetMapping("/reviews")
    public ResponseEntity<?> reviews(@RequestParam(defaultValue = "ALL") String filter,
                                     @RequestParam(defaultValue = "0") int page,
                                     Principal principal){
        try {
            Page<AgencyReviewDto> result = myAgencyService.getMyReviews(principal.getName(), filter, page);

            return ResponseEntity.ok(Map.of(
                    "content", result.getContent(),
                    "page", result.getNumber(),
                    "totalPages", result.getTotalPages(),
                    "totalCount", result.getTotalElements()));

        } catch (IllegalArgumentException e) {
            return notFound(e);
        }
    }

    // 리뷰에 답변 달기
    // POST /my-agency/reviews/5/reply   본문: { "reply": "감사합니다..." }
    @PostMapping("/reviews/{id}/reply")
    public ResponseEntity<?> replyReview(@PathVariable Long id,
                                         @RequestBody Map<String, String> request,
                                         Principal principal){
        try {
            AgencyReviewDto saved = myAgencyService.replyToReview(principal.getName(), id, request.get("reply"));

            return ResponseEntity.ok(Map.of("message", "리뷰에 답변을 등록했습니다.", "review", saved));

        } catch (IllegalArgumentException e) {
            return badRequest(e);
        }
    }

    // 알림 목록 (헤더 종 아이콘)
    // GET /my-agency/notifications
    // 사무소가 아직 없는 중개인도 헤더는 보이므로, 이 API 는 오류 대신 빈 목록을 돌려준다.
    @GetMapping("/notifications")
    public ResponseEntity<Map<String, Object>> notifications(Principal principal){
        try {
            List<NotificationDto> list = myAgencyService.getNotifications(principal.getName());

            return ResponseEntity.ok(Map.of("content", list, "unreadCount", list.size()));

        } catch (IllegalArgumentException e) {
            return ResponseEntity.ok(Map.of("content", List.of(), "unreadCount", 0));
        }
    }

    // 아래 두 메소드는 오류 응답 형태를 통일하려고 따로 뺐다.
    private ResponseEntity<Map<String, String>> notFound(Exception e){
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", e.getMessage()));
    }

    private ResponseEntity<Map<String, String>> badRequest(Exception e){
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", e.getMessage()));
    }
}
