package com.brentversal.property.controller;

import com.brentversal.favorite.service.FavoriteService;
import com.brentversal.property.constant.PropertyStatus;
import com.brentversal.property.dto.AiPricePreviewResponseDto;
import com.brentversal.property.dto.PropertyDraftSummaryDto;
import com.brentversal.property.dto.PropertyResponseDto;
import com.brentversal.property.dto.PropertySearchCondition;
import com.brentversal.property.dto.PropertySearchDto;
import com.brentversal.property.entity.Property;
import com.brentversal.property.service.PropertyService;
import com.brentversal.property.validation.PropertyFinalValidation;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.validation.BindingResult;
import org.springframework.validation.FieldError;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.security.Principal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/property")
@RequiredArgsConstructor
public class PropertyController {

    private final PropertyService propertyService;
    private final FavoriteService favoriteService;

    // DRAFT ID를 받아 최종 검증 후 해당 매물을 관리자 승인대기 PENDING으로 제출하는 Controller 메서드임
    @PostMapping("/insert")
    public ResponseEntity<?> insert(
            @RequestParam Long draftId,
            Principal principal) {

        // 외부 호출/변환 중 오류가 날 수 있어 예외 처리 범위로 묶어둠
        try {
            // 정상 처리 결과를 HTTP 200 응답으로 반환함
            return ResponseEntity.ok(
                    propertyService.submitDraft(
                            draftId,
                            principal.getName()
                    )
            );
        } catch (IllegalArgumentException | IllegalStateException e) {
            // 잘못된 요청 내용을 HTTP 400 응답으로 반환함
            return ResponseEntity.badRequest()
                    .body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping(
            value = "/draft",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE
    )
    // 신규 또는 기존 임시저장 매물을 같은 DRAFT 행에 저장·갱신하는 메서드임
    public ResponseEntity<?> saveDraft(
            @RequestParam(required = false) Long draftId,
            @RequestPart("data") Property bean,
            @RequestPart(value = "files", required = false) List<MultipartFile> files,
            Principal principal) {

        // 외부 호출/변환 중 오류가 날 수 있어 예외 처리 범위로 묶어둠
        try {
            // 정상 처리 결과를 HTTP 200 응답으로 반환함
            return ResponseEntity.ok(
                    propertyService.saveDraft(
                            draftId,
                            bean,
                            files,
                            principal.getName()
                    )
            );
        } catch (IllegalArgumentException | IllegalStateException e) {
            // 잘못된 요청 내용을 HTTP 400 응답으로 반환함
            return ResponseEntity.badRequest()
                    .body(Map.of("message", e.getMessage()));
        }
    }

    // 현재 로그인한 중개인의 사용자용 DRAFT 목록을 최근 수정순으로 조회해 반환하는 API 메서드임
    @GetMapping("/drafts")
    public ResponseEntity<List<PropertyDraftSummaryDto>> myDrafts(Principal principal) {
        // 정상 처리 결과를 HTTP 200 응답으로 반환함
        return ResponseEntity.ok(
                propertyService.findMyDrafts(principal.getName())
        );
    }

    // 지정한 DRAFT가 현재 로그인한 중개인 소유인지 확인한 뒤 이어쓰기용 상세정보를 반환하는 API 메서드임
    @GetMapping("/draft/{draftId}")
    public ResponseEntity<?> myDraft(
            @PathVariable Long draftId,
            Principal principal) {

        // 외부 호출/변환 중 오류가 날 수 있어 예외 처리 범위로 묶어둠
        try {
            // 정상 처리 결과를 HTTP 200 응답으로 반환함
            return ResponseEntity.ok(
                    propertyService.findMyDraft(
                            draftId,
                            principal.getName()
                    )
            );
        } catch (IllegalArgumentException | IllegalStateException e) {
            // 잘못된 요청 내용을 HTTP 400 응답으로 반환함
            return ResponseEntity.badRequest()
                    .body(Map.of("message", e.getMessage()));
        }
    }

    // 저장된 신규등록 DRAFT를 대상으로 AI 시세예측을 실행하고 결과를 저장하는 메서드임
    @PostMapping("/draft/{draftId}/ai-price")
    public ResponseEntity<?> predictDraftAi(
            @PathVariable Long draftId,
            Principal principal) {

        // 외부 호출/변환 중 오류가 날 수 있어 예외 처리 범위로 묶어둠
        try {
            AiPricePreviewResponseDto response =
                    propertyService.predictDraftAi(
                            draftId,
                            principal.getName()
                    );

            // 정상 처리 결과를 HTTP 200 응답으로 반환함
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            // 잘못된 요청 내용을 HTTP 400 응답으로 반환함
            return ResponseEntity.badRequest()
                    .body(Map.of("message", e.getMessage()));
        } catch (IllegalStateException e) {
            // ML 서버 예측 실패를 HTTP 503 Service Unavailable 응답으로 반환함
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(Map.of("message", e.getMessage()));
        }
    }

    // 매물 상세 조회
    @GetMapping("/{id}")
    public ResponseEntity<?> findById(@PathVariable Long id) {
        Optional<PropertyResponseDto> found = propertyService.findById(id);

        if (found.isPresent()) {
            return ResponseEntity.ok(found.get());
        } else {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "해당 매물을 찾을 수 없습니다."));
        }
    }

    // 지도 검색 (왼쪽 필터 + 가운데 지도 + 오른쪽 목록이 함께 쓰는 조회)
    // GET /property/search?region=서초구&dealType=JEONSE&minPrice=0&maxPrice=50000&sort=PRICE_ASC
    //
    // 비회원도 쓸 수 있는 화면이라 로그인을 요구하지 않는다(GET /property/** 는 permitAll).
    // 다만 중개인이 "내 매물"만 볼 때는 누구인지 알아야 해서, 로그인했으면 이메일을 함께 넘긴다.
    @GetMapping("/search")
    public ResponseEntity<Map<String, Object>> search(PropertySearchCondition condition, Principal principal) {
        String email = (principal == null) ? null : principal.getName();

        List<PropertySearchDto> found = propertyService.search(condition, email);

        return ResponseEntity.ok(Map.of("content", found, "totalCount", found.size()));
    }

    // 매물 확인 화면 - 매물유형을 고르면 그 유형에 실제 존재하는 거래유형만 돌려준다 (버튼 목록 갱신용)
    @GetMapping("/deal-types")
    public ResponseEntity<List<String>> dealTypes(@RequestParam(required = false) String type) {
        return ResponseEntity.ok(propertyService.findAvailableDealTypes(type));
    }

    // 매물 확인 화면 전용 조회. 페이징 사용
    @GetMapping("/listings")
    public ResponseEntity<Map<String, Object>> listings(
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String dealType,
            @RequestParam(required = false) String sort,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "6") int size) {
        return ResponseEntity.ok(propertyService.browseListings(type, dealType, sort, page, size));
    }

    // 매물 비교 (쉼표로 구분된 id들을 받아서 여러 건 조회)
    @GetMapping("/compare")
    public ResponseEntity<?> compare(@RequestParam String ids) {
        try {
            List<Long> idList = new ArrayList<>();

            for (String idStr : ids.split(",")) {
                idList.add(Long.parseLong(idStr.trim()));
            }

            return ResponseEntity.ok(propertyService.compareProperties(idList));

        } catch (NumberFormatException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "매물 id 형식이 올바르지 않습니다."));

        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", e.getMessage()));
        }
    }

    // 관심매물 토글 (로그인 필요 — SecurityConfig에서 이 경로는 인증 요구)
    @PostMapping("/{id}/favorite")
    public ResponseEntity<?> toggleFavorite(@PathVariable Long id, Authentication authentication) {
        try {
            boolean favorited = favoriteService.toggle(authentication.getName(), id);
            return ResponseEntity.ok(Map.of("favorited", favorited));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", e.getMessage()));
        }
    }

    // 로그인한 회원의 관심매물 목록 (관심목록 화면용)
    @GetMapping("/favorites")
    public ResponseEntity<?> myFavorites(Authentication authentication) {
        try {
            return ResponseEntity.ok(favoriteService.findFavoriteProperties(authentication.getName()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", e.getMessage()));
        }
    }

    // 로그인한 중개인이 등록한 매물 전체 조회 ("내 매물" 화면용)
    @GetMapping("/mine")
    public ResponseEntity<?> mine(Principal principal) {
        try {
            return ResponseEntity.ok(propertyService.findMine(principal.getName()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", e.getMessage()));
        }
    }

    // 기존 공개 매물을 직접 건드리지 않고 hidden shadow DRAFT에서 수정용 AI 예측을 수행하는 메서드임
    @PostMapping("/{id}/edit-ai-price")
    public ResponseEntity<?> predictEditAi(
            @PathVariable Long id,
            @RequestParam(required = false) Long draftId,
            @RequestBody Property bean,
            Principal principal) {

        // 외부 호출/변환 중 오류가 날 수 있어 예외 처리 범위로 묶어둠
        try {
            // 정상 처리 결과를 HTTP 200 응답으로 반환함
            return ResponseEntity.ok(
                    propertyService.predictEditAi(
                            id,
                            draftId,
                            bean,
                            principal.getName()
                    )
            );
        } catch (IllegalArgumentException e) {
            // 잘못된 요청 내용을 HTTP 400 응답으로 반환함
            return ResponseEntity.badRequest()
                    .body(Map.of("message", e.getMessage()));
        } catch (IllegalStateException e) {
            // 수정용 ML 예측 실패를 HTTP 503 Service Unavailable 응답으로 반환함
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(Map.of("message", e.getMessage()));
        }
    }

    // 수정 폼·파일·shadow DRAFT ID를 받아 PropertyService.update로 기존 매물 수정 요청을 처리하는 Controller 메서드임
    @PutMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> update(
            @PathVariable Long id,
            @RequestParam Long draftId,
            @RequestPart("data") Property bean,
            @RequestPart(value = "files", required = false) List<MultipartFile> files,
            Principal principal) {

        // 외부 호출/변환 중 오류가 날 수 있어 예외 처리 범위로 묶어둠
        try {
            // 정상 처리 결과를 HTTP 200 응답으로 반환함
            return ResponseEntity.ok(
                    propertyService.update(
                            id,
                            draftId,
                            bean,
                            files,
                            principal.getName()
                    )
            );
        } catch (IllegalArgumentException | IllegalStateException e) {
            // 잘못된 요청 내용을 HTTP 400 응답으로 반환함
            return ResponseEntity.badRequest()
                    .body(Map.of("message", e.getMessage()));
        }
    }

    // 거래 상태 변경 (게시중/거래진행중/거래완료)
    @PatchMapping("/{id}/status")
    public ResponseEntity<?> updateStatus(@PathVariable Long id, @RequestBody Map<String, String> request,
                                          Principal principal){
        try{
            PropertyStatus newStatus = PropertyStatus.valueOf(request.get("status"));
            return ResponseEntity.ok(propertyService.updateStatus(id, newStatus, principal.getName()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", e.getMessage()));
        }
    }

    // 등록 취소
    @PatchMapping("/{id}/cancel")
    public ResponseEntity<?> cancel(@PathVariable Long id, Principal principal) {
        try {
            return ResponseEntity.ok(propertyService.cancel(id, principal.getName()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", e.getMessage()));
        }
    }

    // 공개/비공개 전환
    @PatchMapping("/{id}/visibility")
    public ResponseEntity<?> toggleVisibility(@PathVariable Long id, Principal principal) {
        try {
            return ResponseEntity.ok(propertyService.toggleVisibility(id, principal.getName()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", e.getMessage()));
        }
    }
}