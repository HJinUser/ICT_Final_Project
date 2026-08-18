package com.brentversal.recommendation.controller;

import com.brentversal.member.service.MemberService;
import com.brentversal.recommendation.dto.PreferenceRequestDto;
import com.brentversal.recommendation.dto.RecentSearchRequestDto;
import com.brentversal.recommendation.dto.RecommendationFeedbackRequestDto;
import com.brentversal.recommendation.service.RecommendationService;
import jakarta.persistence.EntityNotFoundException;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/*
  맞춤 추천 화면과 취향 초기설정 화면이 쓰는 API 다.

  이 경로 전체는 SecurityConfig 에서 일반 사용자만 통과하게 막아 두었다.
  중개인과 관리자는 맞춤 추천을 쓰지 않기 때문이다.
  그래서 여기서는 로그인 여부를 다시 확인하지 않고 이메일만 꺼내 쓴다.
*/
@Slf4j
@RestController
@RequestMapping("/recommendation")
@RequiredArgsConstructor
public class RecommendationController {

    private final RecommendationService recommendationService;
    private final MemberService memberService;

    // 저장해 둔 취향을 돌려준다. 화면의 왼쪽 사이드바를 채우는 데 쓴다.
    @GetMapping("/preferences")
    public ResponseEntity<?> findPreferences(Authentication authentication) {
        try {
            return ResponseEntity.ok(recommendationService.findPreference(authentication.getName()));
        } catch (EntityNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", e.getMessage()));
        }
    }

    // 화면에서 고른 취향을 저장한다. 이미 저장한 값이 있으면 그 위에 덮어쓴다.
    @PutMapping("/preferences")
    public ResponseEntity<?> savePreferences(Authentication authentication,
                                             @Valid @RequestBody PreferenceRequestDto dto) {
        try {
            recommendationService.savePreference(authentication.getName(), dto);
            return ResponseEntity.ok(Map.of("message", "취향을 저장했습니다."));
        } catch (EntityNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    /*
      맞춤 추천 결과를 돌려준다.

      shownIds 는 이미 화면에 보여 준 매물 id 다. 다른 추천 보기를 눌렀을 때 넘어오며,
      같은 매물이 다시 나오지 않게 하는 데 쓴다.
    */
    @GetMapping
    public ResponseEntity<?> recommendations(Authentication authentication,
                                             @RequestParam(required = false) List<Long> shownIds) {
        try {
            return ResponseEntity.ok(
                    recommendationService.getRecommendations(authentication.getName(), shownIds));
        } catch (EntityNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", e.getMessage()));
        } catch (IllegalStateException e) {
            // 취향 초기설정을 아직 하지 않은 경우다. 화면이 이 응답을 보고 설정 화면으로 보낸다.
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", e.getMessage()));
        }
    }

    // 추천 카드에서 누른 좋아요, 싫어요 평가를 저장한다.
    @PostMapping("/feedback")
    public ResponseEntity<?> feedback(Authentication authentication,
                                      @Valid @RequestBody RecommendationFeedbackRequestDto dto) {
        try {
            recommendationService.saveFeedback(authentication.getName(), dto);
            return ResponseEntity.ok(Map.of("message", "평가를 저장했습니다."));
        } catch (EntityNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    // 고른 매물을 BEST 로 지정한다. BEST 는 한 사람당 하나만 유지된다.
    @PutMapping("/best/{propertyId}")
    public ResponseEntity<?> setBest(Authentication authentication, @PathVariable Long propertyId) {
        try {
            recommendationService.setBest(authentication.getName(), propertyId);
            return ResponseEntity.ok(Map.of("message", "내 BEST 를 변경했습니다."));
        } catch (EntityNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    // 지정해 둔 BEST 를 해제한다.
    @DeleteMapping("/best")
    public ResponseEntity<?> clearBest(Authentication authentication) {
        try {
            recommendationService.clearBest(authentication.getName());
            return ResponseEntity.ok(Map.of("message", "내 BEST 를 해제했습니다."));
        } catch (EntityNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", e.getMessage()));
        }
    }

    // 지도 검색에서 사용자가 건 조건을 최근 검색으로 남긴다.
    @PostMapping("/search-log")
    public ResponseEntity<?> saveSearch(Authentication authentication,
                                        @RequestBody RecentSearchRequestDto dto) {
        try {
            recommendationService.saveRecentSearch(authentication.getName(), dto);
            return ResponseEntity.ok().build();
        } catch (EntityNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    /*
      취향 초기설정을 마쳤다고 표시한다.

      취향만 저장하고 건너뛸 수 없게 하려고, 화면이 취향 저장과 샘플 매물 평가를 모두 마친 뒤에
      이 API 를 부른다. 완료 처리는 여기 한 곳에서만 한다.
    */
    @PostMapping("/preference-complete")
    public ResponseEntity<?> completePreference(Authentication authentication) {
        try {
            memberService.completePreferenceSetup(authentication.getName());
            return ResponseEntity.ok(Map.of("message", "취향 초기설정이 완료되었습니다."));
        } catch (EntityNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", e.getMessage()));
        }
    }
}
