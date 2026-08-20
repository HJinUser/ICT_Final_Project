package com.brentversal.admin.service;

import com.brentversal.admin.dto.AdminPropertyDto;
import com.brentversal.common.mail.MailService;
import com.brentversal.member.entity.Member;
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
    private final MailService mailService ;

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
        notifyOwner(property,
                "[전세역전] 매물 가격 평가가 등록되었습니다",
                "\"" + property.getName() + "\" 매물의 AI 가격 평가가 \"" + evaluationLabel(evaluation) + "\"(으)로 등록되었습니다.");
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
        notifyOwner(property,
                "[전세역전] 매물이 승인되었습니다",
                "\"" + property.getName() + "\" 매물이 승인되어 게시중 상태로 전환되었습니다.");
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
        notifyOwner(property,
                "[전세역전] 매물이 반려되었습니다",
                "\"" + property.getName() + "\" 매물이 반려되어 등록이 취소되었습니다. 다시 등록하시려면 매물을 새로 등록해 주세요.");
        return AdminPropertyDto.of(property);
    }

    // 비공개 처리 : 공개 -> 비공개 (매물 자체는 남아있고 노출만 막음)
    @Transactional
    public AdminPropertyDto hide(Long id){
        Property property = propertyRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("해당 매물을 찾을 수 없습니다. id=" + id));

        property.setVisible(false);
        notifyOwner(property,
                "[전세역전] 매물이 비공개 처리되었습니다",
                "\"" + property.getName() + "\" 매물이 비공개로 전환되어 사용자 화면에서 보이지 않습니다.");
        return AdminPropertyDto.of(property);
    }

    // 공개 처리 : 비공개 -> 공개 (되돌리기)
    @Transactional
    public AdminPropertyDto unhide(Long id){
        Property property = propertyRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("해당 매물을 찾을 수 없습니다. id=" + id));

        property.setVisible(true);
        notifyOwner(property,
                "[전세역전] 매물이 다시 공개되었습니다",
                "\"" + property.getName() + "\" 매물이 다시 공개되어 사용자 화면에 노출됩니다.");
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

    // 매물 소유자(중개인)에게 상태 변경 메일을 보낸다.
// 사무소에 아직 회원이 연결 안 됐거나 이메일이 없으면 조용히 건너뛴다.
// 메일 발송 실패로 승인/반려 같은 실제 처리 자체가 롤백되면 안 되므로 예외를 여기서 잡아 삼킨다.
    private void notifyOwner(Property property, String subject, String body) {
        Member member = property.getAgency() != null ? property.getAgency().getMember() : null;
        if (member == null || member.getEmail() == null || member.getEmail().isBlank()) {
            return;
        }
        try {
            mailService.sendText(member.getEmail(), subject, body);
        } catch (Exception e) {
            log.warn("매물 상태 변경 알림 메일 발송 실패. propertyId={}, email={}", property.getId(), member.getEmail(), e);
        }
    }

    private String evaluationLabel(PriceEvaluationStatus evaluation) {
        return switch (evaluation) {
            case UNDERVALUED -> "저평가";
            case FAIR -> "적정";
            case OVERVALUED -> "고평가";
        };
    }
}