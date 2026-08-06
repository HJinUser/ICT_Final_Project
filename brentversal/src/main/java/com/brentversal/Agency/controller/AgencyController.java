package com.brentversal.Agency.controller;

import com.brentversal.Agency.dto.AgencyResponseDto;
import com.brentversal.Agency.service.AgencyService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/agency")
@RequiredArgsConstructor
public class AgencyController {
    private final AgencyService agencyService ;

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

    // 중개사무소 1건 조회 (상세 페이지용)
    // GET /agency/1
    @GetMapping("/{id}")
    public ResponseEntity<?> detail(@PathVariable Long id){
        Optional<AgencyResponseDto> agency = agencyService.findById(id);

        if(agency.isEmpty()){ // 없는 id 로 요청한 경우
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "해당 중개사무소를 찾을 수 없습니다."));
        }

        return ResponseEntity.ok(agency.get());
    }
}
