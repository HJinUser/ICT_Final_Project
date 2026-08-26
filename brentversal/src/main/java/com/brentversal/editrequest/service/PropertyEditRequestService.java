package com.brentversal.editrequest.service;

import com.brentversal.agency.entity.Agency;
import com.brentversal.common.mail.MailService;
import com.brentversal.editrequest.constant.EditRequestStatus;
import com.brentversal.editrequest.dto.PropertyEditRequestDto;
import com.brentversal.editrequest.entity.PropertyEditRequest;
import com.brentversal.editrequest.repository.PropertyEditRequestRepository;
import com.brentversal.member.entity.Member;
import com.brentversal.member.repository.MemberRepository;
import com.brentversal.property.constant.PropertyStatus;
import com.brentversal.property.entity.Property;
import com.brentversal.property.repository.PropertyRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/*
  매물 수정 요청 서비스 (관리자 -> 중개인)

  반려(등록 취소)는 되돌릴 수 없어서, 사진이 부족하다거나 설명이 부실한 정도의 문제까지
  반려로 처리하면 중개인이 매물을 통째로 다시 올려야 한다. 그래서 매물은 그대로 두고
  "무엇을 고쳐야 하는지"만 알리는 통로를 따로 둔다.

  중개인이 그 매물을 실제로 수정하면(PropertyService.update) 미처리 요청이 자동으로
  처리 완료가 되므로, 중개인이 따로 "확인" 을 누를 필요가 없다.

  권한 확인은 각 경로에서 이미 끝난다.
    - 관리자 : /admin/**        -> SecurityConfig 에서 ROLE_ADMIN 만 통과
    - 중개인 : /my-agency/**    -> SecurityConfig 에서 ROLE_BROKER 만 통과
  그래서 여기서는 "내 사무소 자료가 맞는지"(agencyId)만 확인한다.
*/
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PropertyEditRequestService {

    private final PropertyEditRequestRepository propertyEditRequestRepository;
    private final PropertyRepository propertyRepository;
    private final MemberRepository memberRepository;
    private final MailService mailService;

    // 수정 요청 등록. 요청을 보낸 뒤 매물을 등록한 중개인에게 안내 메일을 보낸다.
    @Transactional
    public PropertyEditRequestDto create(Long propertyId, String adminEmail, String reason) {
        // null 검사를 먼저 한다. 아래 trim() 에서 터지면 원인을 알기 어렵다.
        if (reason == null || reason.isBlank()) {
            throw new IllegalArgumentException("수정 요청 사유를 입력해 주세요.");
        }

        Member requester = memberRepository.findByEmail(adminEmail);

        if (requester == null) {
            throw new IllegalArgumentException("회원 정보를 찾을 수 없습니다.");
        }

        Property property = propertyRepository.findById(propertyId)
                .orElseThrow(() -> new IllegalArgumentException("해당 매물을 찾을 수 없습니다. id=" + propertyId));

        // 임시저장은 중개인이 아직 작성 중인 매물이라 관리자에게 보이지 않는다.
        // 등록 취소된 매물은 되돌릴 수 없어서 고쳐 달라고 할 대상이 아니다.
        if (property.getStatus() == PropertyStatus.DRAFT
                || property.getStatus() == PropertyStatus.CANCELLED) {
            throw new IllegalStateException(
                    "임시저장·등록취소 매물에는 수정 요청을 보낼 수 없습니다. 현재 상태 : " + property.getStatus());
        }

        PropertyEditRequest bean = new PropertyEditRequest();

        bean.setProperty(property);
        bean.setRequester(requester);
        bean.setReason(reason.trim());
        bean.setStatus(EditRequestStatus.REQUESTED);
        bean.setCreatedAt(LocalDateTime.now());

        PropertyEditRequest saved = propertyEditRequestRepository.save(bean);

        notifyOwner(saved);

        return PropertyEditRequestDto.of(saved);
    }

    // 매물 1건의 수정 요청 이력 (관리자 화면)
    public List<PropertyEditRequestDto> findByProperty(Long propertyId) {
        return propertyEditRequestRepository.findByPropertyId(propertyId).stream()
                .map(PropertyEditRequestDto::of)
                .toList();
    }

    // 내 사무소가 받은 수정 요청 (중개인 화면). openOnly 면 아직 처리하지 않은 것만 준다.
    public List<PropertyEditRequestDto> findByAgency(Long agencyId, boolean openOnly) {
        List<PropertyEditRequest> found = openOnly
                ? propertyEditRequestRepository.findByAgencyIdAndStatus(agencyId, EditRequestStatus.REQUESTED)
                : propertyEditRequestRepository.findByAgencyId(agencyId);

        return found.stream()
                .map(PropertyEditRequestDto::of)
                .toList();
    }

    // 헤더 알림에서 쓰는 미처리 요청 목록.
    // 알림은 DTO 가 아니라 엔티티에서 바로 필요한 값만 뽑아 쓰므로 엔티티 그대로 준다.
    public List<PropertyEditRequest> findOpenByAgency(Long agencyId) {
        return propertyEditRequestRepository.findByAgencyIdAndStatus(agencyId, EditRequestStatus.REQUESTED);
    }

    /*
      매물이 수정되면 그 매물의 미처리 요청을 모두 처리 완료로 바꾼다.

      중개인이 "확인했습니다" 를 따로 누르게 하면 실제로 고쳤는지와 어긋난다.
      매물 수정 자체가 요청에 대한 응답이므로 그 시점에 닫는다.
      요청 처리 실패가 매물 수정을 되돌리면 안 되므로 호출하는 쪽에서 예외를 삼킨다.
    */
    @Transactional
    public int resolveOpenRequests(Long propertyId) {
        List<PropertyEditRequest> targets =
                propertyEditRequestRepository.findByPropertyIdAndStatus(propertyId, EditRequestStatus.REQUESTED);

        LocalDateTime now = LocalDateTime.now();

        for (PropertyEditRequest bean : targets) {
            bean.setStatus(EditRequestStatus.RESOLVED);
            bean.setResolvedAt(now);
        }

        propertyEditRequestRepository.saveAll(targets);

        return targets.size();
    }

    // 매물을 올린 중개인에게 안내 메일을 보낸다.
    // 메일 발송 실패가 요청 등록을 되돌리면 안 되므로 여기서 예외를 삼킨다.
    private void notifyOwner(PropertyEditRequest bean) {
        Agency agency = bean.getProperty().getAgency();
        Member owner = (agency == null) ? null : agency.getMember();

        if (owner == null || owner.getEmail() == null || owner.getEmail().isBlank()) {
            log.debug("수정 요청 알림 메일 대상 없음. editRequestId={}", bean.getId());
            return;
        }

        try {
            mailService.sendText(owner.getEmail(),
                    "[전세역전] 매물 수정 요청이 도착했습니다",
                    "\"" + bean.getProperty().getName() + "\" 매물에 관리자 수정 요청이 도착했습니다.\n\n"
                            + "요청 내용: " + bean.getReason() + "\n\n"
                            + "매물 수정 화면에서 내용을 고쳐 주시면 요청이 자동으로 처리 완료됩니다.");
        } catch (Exception e) {
            log.warn("수정 요청 알림 메일 발송 실패. editRequestId={}, email={}",
                    bean.getId(), owner.getEmail(), e);
        }
    }
}
