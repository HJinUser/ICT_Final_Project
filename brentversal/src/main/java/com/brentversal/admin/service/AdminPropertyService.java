package com.brentversal.admin.service;

import com.brentversal.admin.dto.AdminPropertyDto;
import com.brentversal.common.ml.MlClient;
import com.brentversal.property.constant.PropertyStatus;
import com.brentversal.property.constant.PriceEvaluationStatus;
import com.brentversal.property.entity.Property;
import com.brentversal.property.repository.PropertyRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

// 관리자가 매물을 승인하거나 반려하는 서비스
//
// 중개인이 매물을 등록하면 상태가 PENDING(승인 대기)으로 저장된다.
// 관리자가 승인해야 ACTIVE(게시중)가 되고, 그때부터 지도·중개사무소 상세 등 사용자 화면에 노출된다.
//
// 권한 확인은 SecurityConfig 에서 /admin/** 을 ROLE_ADMIN 으로 막아 두었으므로 여기서 다시 하지 않는다.
@Slf4j
@Service
@RequiredArgsConstructor
public class AdminPropertyService {
    private final PropertyRepository propertyRepository ;
    private final MlClient mlClient ;

    // 한 페이지에 10건씩 보여 준다
    private static final int PAGE_SIZE = 10 ;

    // 매물 목록.
    // status 를 주지 않거나 ALL 이면 전체를, 상태 이름을 주면 그 상태만 보여 준다.
    // 기본값은 화면에서 PENDING 을 넘긴다 (관리자가 가장 먼저 할 일이 승인이기 때문).
    @Transactional(readOnly = true)
    public Page<AdminPropertyDto> getProperties(String status, int page){
        Pageable pageable = PageRequest.of(Math.max(0, page), PAGE_SIZE);

        if(status == null || status.isBlank() || "ALL".equalsIgnoreCase(status)){
            // Repository를 통해 필요한 DB 데이터를 조회/변경함
            return propertyRepository.findByStatusNotOrderByCreatedAtDesc(
                            PropertyStatus.DRAFT,
                            pageable
                    )
                    .map(AdminPropertyDto::of);
        }

        return propertyRepository.findByStatusOrderByCreatedAtAsc(toStatus(status), pageable)
                .map(AdminPropertyDto::of);
    }

    // 상단 요약에 쓰는 승인 대기 건수
    @Transactional(readOnly = true)
    public long countPending(){
        return propertyRepository.countByStatus(PropertyStatus.PENDING);
    }

    // 승인대기 매물에 관리자가 선택한 저평가·적정·고평가 값을 저장하고 DTO로 반환하는 Service 메서드임
    @Transactional
    public AdminPropertyDto evaluatePrice(Long id, PriceEvaluationStatus evaluation) {
        Property property = findPendingOrThrow(id);

        // 현재 값/권한/상태가 조건을 만족하는지 확인함
        if (evaluation == null) {
            // 조건을 만족하지 않으면 이후 처리를 중단하도록 예외 발생시킴
            throw new IllegalArgumentException("가격 평가값이 필요합니다.");
        }

        // 관리자가 선택한 가격평가 상태를 Property에 반영함
        property.setPriceEvaluation(evaluation);

        // 처리 완료된 결과를 호출한 쪽으로 반환함
        return AdminPropertyDto.of(property);
    }

    // 관리자 가격평가가 완료된 승인대기 매물을 ACTIVE 상태로 승인하는 Service 메서드임
    @Transactional
    public AdminPropertyDto approve(Long id){
        Property property = findPendingOrThrow(id);

        // 현재 값/권한/상태가 조건을 만족하는지 확인함
        if (property.getPriceEvaluation() == null) {
            // 조건을 만족하지 않으면 이후 처리를 중단하도록 예외 발생시킴
            throw new IllegalStateException(
                    "AI 예상 시세를 확인한 뒤 저평가/적정/고평가 중 하나를 먼저 선택해 주세요."
            );
        }

        // 관리자 승인 완료 매물을 게시중 ACTIVE 상태로 변경함
        property.setStatus(PropertyStatus.ACTIVE);

        // 처리 완료된 결과를 호출한 쪽으로 반환함
        return AdminPropertyDto.of(property);
    }

    // 반려 : 승인 대기 -> 등록 취소
    //
    // PropertyStatus 에 '반려' 상태가 따로 없어서 등록 취소(CANCELLED)로 처리한다.
    // 등록 취소는 되돌릴 수 없으므로, 중개인이 고쳐서 다시 올리려면 매물을 새로 등록해야 한다.
    // (재신청 흐름이 필요해지면 REJECTED 상태와 반려 사유 컬럼을 추가해야 한다)
    @Transactional
    public AdminPropertyDto reject(Long id){
        Property property = findPendingOrThrow(id);

        property.setStatus(PropertyStatus.CANCELLED);

        return AdminPropertyDto.of(property);
    }

    // 승인·반려는 승인 대기 상태에서만 할 수 있다.
    // 이미 처리한 매물을 두 번 누르거나, 목록을 새로고침하지 않은 채 눌렀을 때를 막는다.
    private Property findPendingOrThrow(Long id){
        Property property = propertyRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("해당 매물을 찾을 수 없습니다. id=" + id));

        if(property.getStatus() != PropertyStatus.PENDING){
            throw new IllegalStateException("승인 대기 상태의 매물만 처리할 수 있습니다. 현재 상태 : " + property.getStatus());
        }

        return property;
    }

    // 문자열로 들어온 상태값을 열거형으로 바꾼다. 잘못된 값이면 안내 메시지를 준다.
    private PropertyStatus toStatus(String status){
        PropertyStatus parsed;

        try {
            parsed = PropertyStatus.valueOf(status.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("알 수 없는 상태값입니다 : " + status);
        }

        // 현재 값/권한/상태가 조건을 만족하는지 확인함
        if (parsed == PropertyStatus.DRAFT) {
            // 조건을 만족하지 않으면 이후 처리를 중단하도록 예외 발생시킴
            throw new IllegalArgumentException(
                    "DRAFT는 사용자 작성 중 상태이므로 관리자 매물 목록에서 조회하지 않습니다.");
        }

        // 처리 완료된 결과를 호출한 쪽으로 반환함
        return parsed;
    }

    /*
      행정동이 비어 있는 기존 매물을 좌표로 판정해 한 번에 채운다.

      행정동 저장은 매물을 등록·수정할 때 자동으로 이루어지므로, 이 작업은 그 기능이
      생기기 전에 등록된 매물에만 필요하다. 그래서 관리자가 한 번 실행하는 형태로 둔다.

      한 건이 실패해도 나머지는 계속 채운다. 서울 밖 좌표처럼 판정할 수 없는 매물은
      건너뛰고 개수만 알려 준다. 다시 실행해도 이미 채운 매물은 대상에서 빠진다.
    */
    @Transactional
    public Map<String, Object> backfillAdminCode() {
        List<Property> targets = propertyRepository.findMissingAdminCode();

        int filled = 0;
        int outside = 0;
        int failed = 0;

        for (Property property : targets) {
            // 외부 호출 중 오류가 나도 나머지 매물 처리는 계속되어야 함
            try {
                Map<String, Object> resolved =
                        mlClient.resolveAdminDong(property.getLatitude(), property.getLongitude());

                // 서울 경계 밖이면 판정 결과가 없다. 오류가 아니므로 세어만 둔다.
                if (resolved == null || resolved.get("adminCode") == null) {
                    outside++;
                    continue;
                }

                property.setAdminCode(String.valueOf(resolved.get("adminCode")));
                property.setAdminName(String.valueOf(resolved.get("adminName")));
                filled++;

            } catch (Exception e) {
                failed++;
                log.warn("행정동 백필 실패. propertyId={}", property.getId(), e);
            }
        }

        log.info("행정동 백필 완료. 대상={} 채움={} 경계밖={} 실패={}",
                targets.size(), filled, outside, failed);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("targetCount", targets.size());
        result.put("filledCount", filled);
        result.put("outsideCount", outside);
        result.put("failedCount", failed);
        // 처리 완료된 결과를 호출한 쪽으로 반환함
        return result;
    }
}