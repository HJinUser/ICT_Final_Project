package com.brentversal.neighborhood.controller;

import com.brentversal.common.ml.MlClient;
import com.brentversal.neighborhood.dto.NeighborhoodCreateRequest;
import com.brentversal.neighborhood.dto.NeighborhoodExploreResponse;
import com.brentversal.neighborhood.dto.NeighborhoodListResponse;
import com.brentversal.neighborhood.dto.NeighborhoodResponse;
import com.brentversal.neighborhood.dto.NeighborhoodSearchRequest;
import com.brentversal.neighborhood.dto.NeighborhoodTagReviewDto;
import com.brentversal.neighborhood.dto.NeighborhoodTagUpdateRequest;
import com.brentversal.neighborhood.service.NeighborhoodService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/neighborhoods")
@RequiredArgsConstructor
public class NeighborhoodController {

    private final NeighborhoodService neighborhoodService;
    // React가 FastAPI를 직접 부르지 않도록, 행정동 ML 분석 결과를 이 서버가 대신 받아 전달한다.
    private final MlClient mlClient;

    @GetMapping
    public NeighborhoodListResponse list(
            @ModelAttribute NeighborhoodSearchRequest request,
            Authentication authentication
    ) {
        return neighborhoodService.search(request, isAdmin(authentication));
    }

    /*
      동네 탐색을 서울 전체 행정동(425개) 기준으로 보여준다.

      위의 list()는 관리자가 등록한 법정동만 보여주고(현재 6개), 이건 파이썬 K-Means 결과 전체를
      기본으로 삼아 군집·자치구로 실제 탐색이 되게 한다. 등록된 법정동과 대응되면 그 설명·사진·태그를
      함께 붙여 준다(NeighborhoodService.explore 참고).
      경로가 "/explore" 정적 문자열이라 아래 "/{id}" 와 겹치지 않는다.
    */
    @GetMapping("/explore")
    public NeighborhoodExploreResponse explore(
            @RequestParam(required = false) String clusterName,
            @RequestParam(required = false) String district,
            @RequestParam(required = false) List<String> tagNames
    ) {
        return neighborhoodService.explore(clusterName, district, tagNames);
    }

    @GetMapping("/{id}")
    public NeighborhoodResponse detail(
            @PathVariable Long id,
            Authentication authentication
    ) {
        return neighborhoodService.findById(id, isAdmin(authentication));
    }

    @PatchMapping("/{id}/visibility")
    public NeighborhoodResponse toggleVisibility(@PathVariable Long id) {
        return neighborhoodService.toggleVisibility(id);
    }

    /*
      한줄평 키워드에서 뽑은 동네별 태그 후보를 돌려준다. 관리자 검토 화면이 쓴다.

      이 조회만으로는 태그가 붙지 않는다. 관리자가 고른 뒤 아래 PATCH 로 확정해야 붙는다.
      경로가 "/tag-suggestions" 정적 문자열이라 아래 "/{id}" 와 겹치지 않는다.

      GET /neighborhoods/** 는 공개라, SecurityConfig 에서 이 경로만 따로 앞에 두어 관리자로 막았다.
      이 프로젝트는 @EnableMethodSecurity 를 켜지 않아 @PreAuthorize 가 동작하지 않으므로,
      인가는 반드시 SecurityConfig 매처로 건다.
    */
    @GetMapping("/tag-suggestions")
    public List<NeighborhoodTagReviewDto> tagSuggestions() {
        return neighborhoodService.tagSuggestions();
    }

    /*
      관리자가 확정한 태그로 이 동네의 태그를 통째로 바꾼다.

      보낸 목록이 최종 상태다. 추천을 받아들이는 것과 붙어 있던 태그를 떼는 것을 함께 처리한다.
      SecurityConfig 에서 PATCH /neighborhoods/** 를 관리자만 통과시킨다.
    */
    @PatchMapping("/{id}/tags")
    public ResponseEntity<?> updateTags(@PathVariable Long id,
                                        @RequestBody NeighborhoodTagUpdateRequest request) {
        try {
            return ResponseEntity.ok(neighborhoodService.replaceTags(id, request.getTagIds()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    // 관리자 "동네 등록". SecurityConfig에서 ADMIN만 호출 가능하도록 막아 둔다.
    @PostMapping
    public ResponseEntity<?> create(@Valid @RequestBody NeighborhoodCreateRequest request) {
        try {
            return ResponseEntity.status(HttpStatus.CREATED).body(neighborhoodService.create(request));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    private boolean isAdmin(Authentication authentication) {
        return authentication != null && authentication.getAuthorities().stream()
                .anyMatch(authority -> authority.getAuthority().equals("ROLE_ADMIN"));
    }

    /*
      행정동 K-Means 분석 결과를 돌려준다.

      adminCode 는 통계청 행정동 코드이고, 위의 /{id} 가 쓰는 Neighborhood.id(법정동)와는
      코드 체계가 다르다. 둘을 서로 바꿔 넣으면 안 된다.
      경로가 "/ml/{adminCode}" 두 마디라서 한 마디인 /{id} 와는 애초에 겹치지 않는다.
      SecurityConfig 의 GET /neighborhoods/** permitAll 에 이미 포함되어 비회원도 볼 수 있다.
    */
    @GetMapping("/ml/{adminCode}")
    public ResponseEntity<?> mlDetail(@PathVariable String adminCode) {
        return ResponseEntity.ok(mlClient.neighborhood(adminCode));
    }

    /*
      이 법정동 동네에 대응하는 행정동 AI 분석 결과를 돌려준다.

      동네 탐색(이 엔터티)은 법정동 기준이고 K-Means 는 행정동 기준이라 이름이 다르다.
      이 매물을 등록할 때 좌표로 행정동을 판정한 것과 달리, 동네는 좌표가 없어서
      (자치구, 법정동) 이름으로 매핑표를 거쳐 찾는다.

      법정동 하나가 행정동 여러 개에 걸치는 경우(전체의 약 30%)가 있는데,
      그때는 매핑표에 먼저 나오는 행정동 하나를 대표로 보여 준다. 완벽히 정확하진 않지만
      "이 동네가 대략 어떤 성격인가"를 보여 주는 참고 정보로는 충분하다.

      매핑이 없으면 파이썬이 404를 주고 이 메서드도 404로 그대로 넘긴다.
      프론트는 이 경우 AI 분석 영역만 숨기고 나머지 동네 정보는 그대로 보여 준다.
    */
    @GetMapping("/{id}/ml")
    public ResponseEntity<?> mlByLegalDong(@PathVariable Long id, Authentication authentication) {
        NeighborhoodResponse neighborhood = neighborhoodService.findById(id, isAdmin(authentication));

        Map<String, Object> analysis = mlClient.neighborhoodByLegal(
                neighborhood.getDistrict(), neighborhood.getDong());

        if (analysis == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "이 동네는 아직 행정동 분석에 연결되지 않았습니다."));
        }

        return ResponseEntity.ok(analysis);
    }
}
