package com.brentversal.agency.controller;

import com.brentversal.agency.dto.AgencyDetailDto;
import com.brentversal.agency.dto.AgencyResponseDto;
import com.brentversal.agency.dto.AgencyReviewDto;
import com.brentversal.agency.dto.ConsultationRequestDto;
import com.brentversal.agency.dto.ReviewRequestDto;
import com.brentversal.agency.service.AgencyConsultationService;
import com.brentversal.agency.service.AgencyReviewService;
import com.brentversal.agency.service.AgencyService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/agency")
@RequiredArgsConstructor
public class AgencyController {
    private final AgencyService agencyService ;
    private final AgencyConsultationService agencyConsultationService ;
    private final AgencyReviewService agencyReviewService ;

    // 중개사무소 목록 조회
    // GET /agency                            : 전체 목록
    // GET /agency?keyword=반포&region=서초구  : 검색어 + 지역 필터
    // @RequestParam(required = false) : 파라미터를 안 보내도 400 이 나지 않게 한다(값은 null 이 된다).
    //
    // 응답을 배열이 아니라 객체로 감싸는 이유:
    // 목록 외에 화면 상단 통계(인증 사무소 수)도 함께 내려야 하고,
    // 나중에 페이징(Page<T>)을 붙일 때 응답 구조를 바꾸지 않아도 되기 때문이다.
    @GetMapping
    public ResponseEntity<Map<String, Object>> list(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String region){

        List<AgencyResponseDto> agencies = agencyService.search(keyword, region);

        return ResponseEntity.ok(Map.of(
                "content", agencies,                          // 중개사무소 목록
                "totalCount", agencies.size(),                 // 검색 결과 건수
                "verifiedCount", agencyService.countVerified() // 인증 완료 사무소 수
        ));
    }

    // 중개사무소 상세 조회 (중개사무소 상세 페이지)
    // GET /agency/1
    // 사무소 정보 + 담당 매물 + 후기 개수를 한 번에 내려 준다. 비회원도 볼 수 있다.
    @GetMapping("/{id}")
    public ResponseEntity<?> detail(@PathVariable Long id){
        Optional<AgencyDetailDto> agency = agencyService.findDetailById(id);

        if(agency.isEmpty()){ // 없는 id 로 요청한 경우
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "해당 중개사무소를 찾을 수 없습니다."));
        }

        return ResponseEntity.ok(agency.get());
    }

    // 이용자 평가(후기) 목록 조회
    // GET /agency/1/reviews
    @GetMapping("/{id}/reviews")
    public ResponseEntity<List<AgencyReviewDto>> reviews(@PathVariable Long id){
        return ResponseEntity.ok(agencyReviewService.findByAgency(id));
    }

    // 내가 이 사무소에 후기를 쓸 수 있는지 확인
    // GET /agency/1/reviews/eligibility
    // 로그인이 필요한 요청이라, 비회원이 부르면 시큐리티가 401 을 돌려준다.
    // Principal : 시큐리티가 넣어 준 로그인 사용자 정보. JwtAuthenticationFilter 가 이메일을 담아 둔다.
    @GetMapping("/{id}/reviews/eligibility")
    public ResponseEntity<Map<String, Object>> reviewEligibility(@PathVariable Long id, Principal principal){
        boolean eligible = agencyReviewService.canWrite(id, principal.getName());

        return ResponseEntity.ok(Map.of("eligible", eligible));
    }

    // 이용자 평가(후기) 작성
    // POST /agency/1/reviews
    // 상담을 요청한 적이 있는 회원만 쓸 수 있다 (검사는 서비스에서 한다).
    @PostMapping("/{id}/reviews")
    public ResponseEntity<Map<String, Object>> writeReview(
            @PathVariable Long id,
            @RequestBody ReviewRequestDto dto,
            Principal principal){

        try {
            Long reviewId = agencyReviewService.create(id, principal.getName(), dto);

            return ResponseEntity.ok(Map.of("reviewId", reviewId, "message", "후기를 등록했습니다."));

        } catch (IllegalArgumentException e) {
            // 자격이 없거나 입력값이 잘못된 경우 : 원인을 알 수 있게 메시지와 함께 400 으로 응답한다
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", e.getMessage()));
        }
    }

    // 상담 요청 보내기
    // POST /agency/1/consultations
    // 로그인한 회원만 보낼 수 있고, 내 정보 제공에 동의해야 저장된다.
    @PostMapping("/{id}/consultations")
    public ResponseEntity<Map<String, Object>> requestConsultation(
            @PathVariable Long id,
            @RequestBody ConsultationRequestDto dto,
            Principal principal){

        try {
            Long consultationId = agencyConsultationService.create(id, principal.getName(), dto);

            return ResponseEntity.ok(Map.of(
                    "consultationId", consultationId,
                    "message", "상담 요청을 전송했습니다."));

        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", e.getMessage()));
        }
    }
}
