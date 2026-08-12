package com.brentversal.admin.service;

import com.brentversal.admin.dto.AdminPropertyDto;
import com.brentversal.property.constant.PropertyStatus;
import com.brentversal.property.entity.Property;
import com.brentversal.property.repository.PropertyRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

// 관리자가 매물을 승인하거나 반려하는 서비스
//
// 중개인이 매물을 등록하면 상태가 PENDING(승인 대기)으로 저장된다.
// 관리자가 승인해야 ACTIVE(게시중)가 되고, 그때부터 지도·중개사무소 상세 등 사용자 화면에 노출된다.
//
// 권한 확인은 SecurityConfig 에서 /admin/** 을 ROLE_ADMIN 으로 막아 두었으므로 여기서 다시 하지 않는다.
@Service
@RequiredArgsConstructor
public class AdminPropertyService {
    private final PropertyRepository propertyRepository ;

    // 한 페이지에 10건씩 보여 준다
    private static final int PAGE_SIZE = 10 ;

    // 매물 목록.
    // status 를 주지 않거나 ALL 이면 전체를, 상태 이름을 주면 그 상태만 보여 준다.
    // 기본값은 화면에서 PENDING 을 넘긴다 (관리자가 가장 먼저 할 일이 승인이기 때문).
    @Transactional(readOnly = true)
    public Page<AdminPropertyDto> getProperties(String status, int page){
        Pageable pageable = PageRequest.of(Math.max(0, page), PAGE_SIZE);

        if(status == null || status.isBlank() || "ALL".equalsIgnoreCase(status)){
            return propertyRepository.findAllByOrderByCreatedAtDesc(pageable).map(AdminPropertyDto::of);
        }

        return propertyRepository.findByStatusOrderByCreatedAtAsc(toStatus(status), pageable)
                .map(AdminPropertyDto::of);
    }

    // 상단 요약에 쓰는 승인 대기 건수
    @Transactional(readOnly = true)
    public long countPending(){
        return propertyRepository.countByStatus(PropertyStatus.PENDING);
    }

    // 승인 : 승인 대기 -> 게시중
    // 이 시점부터 사용자 화면에 노출된다.
    @Transactional
    public AdminPropertyDto approve(Long id){
        Property property = findPendingOrThrow(id);

        property.setStatus(PropertyStatus.ACTIVE);

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
        try {
            return PropertyStatus.valueOf(status.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("알 수 없는 상태값입니다 : " + status);
        }
    }
}
