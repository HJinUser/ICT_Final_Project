package com.brentversal.admin.service;

import com.brentversal.admin.dto.AdminBrokerDto;
import com.brentversal.agency.entity.Agency;
import com.brentversal.agency.repository.AgencyRepository;
import com.brentversal.agency.service.AgencyService;
import com.brentversal.member.constant.VerifyStatus;
import com.brentversal.member.entity.Broker;
import com.brentversal.member.repository.BrokerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

// 관리자가 중개인 인증 신청을 심사하는 서비스
//
// 중개인이 "내 중개사무소 인증 받기"에서 자격증 사진과 사무소 정보를 제출하면 상태가 PENDING(심사 중)이 된다.
// 관리자가 디지털트윈국토에서 실제 사무소를 확인한 뒤 승인하면 VERIFIED 가 되고,
// 이때 중개사무소에 인증 마크(agency.verified)가 붙어 사용자 화면에 "인증 완료"로 표시된다.
//
// 권한 확인은 SecurityConfig 에서 /admin/** 을 ROLE_ADMIN 으로 막아 두었으므로 여기서 다시 하지 않는다.
@Service
@RequiredArgsConstructor
public class AdminBrokerService {
    private final BrokerRepository brokerRepository ;
    private final AgencyRepository agencyRepository ;

    // 사무소가 없는 중개인을 승인할 때 신청 정보로 사무소를 만들어 주기 위해 쓴다
    private final AgencyService agencyService ;

    // 한 페이지에 10건씩 보여 준다
    private static final int PAGE_SIZE = 10 ;

    // 인증 신청 목록.
    // status 를 주지 않거나 ALL 이면 전체를, 상태 이름을 주면 그 상태만 보여 준다.
    @Transactional(readOnly = true)
    public Page<AdminBrokerDto> getBrokers(String status, int page){
        Pageable pageable = PageRequest.of(Math.max(0, page), PAGE_SIZE);

        Page<Broker> result;

        if(status == null || status.isBlank() || "ALL".equalsIgnoreCase(status)){
            result = brokerRepository.findAllByOrderBySubmittedAtDesc(pageable);
        } else {
            result = brokerRepository.findByVerifyStatusOrderBySubmittedAtAsc(toStatus(status), pageable);
        }

        // 사무소는 Broker 가 직접 갖고 있지 않아서 회원 id 로 따로 찾는다
        return result.map(broker -> AdminBrokerDto.of(broker, findAgency(broker)));
    }

    // 상단 요약에 쓰는 심사 대기 건수
    @Transactional(readOnly = true)
    public long countPending(){
        return brokerRepository.countByVerifyStatus(VerifyStatus.PENDING);
    }

    // 승인 : 심사 중 -> 인증 완료
    //
    // 중개인의 상태만 바꾸는 것이 아니라 중개사무소에도 인증 마크를 붙인다.
    // 사용자 화면(중개사무소 목록·상세)이 보는 값은 agency.verified 이기 때문에,
    // 이 처리를 빠뜨리면 승인해도 화면에는 계속 "미인증"으로 남는다.
    @Transactional
    public AdminBrokerDto approve(Long id){
        Broker broker = findPendingOrThrow(id);

        broker.setVerifyStatus(VerifyStatus.VERIFIED);
        broker.setReviewedAt(LocalDateTime.now());
        broker.setRejectReason(null);

        // 사무소가 없는 상태로 신청이 올라와 있을 수도 있어(인증 신청에서 사무소를 만들기 전에 신청한 경우)
        // 승인 시점에도 한 번 더 확인해서 없으면 신청 정보로 만들어 준다.
        // 지역 조각(구·동)은 null 로 넘긴다.
        // 인증을 신청할 때 이미 사무소가 만들어지면서 값이 채워지므로, 이 자리까지 오는 것은
        // 그 처리가 없던 시절에 신청한 오래된 자료뿐이고 그때는 애초에 받아 둔 값이 없다.
        // (사무소 정보 화면에서 주소를 한 번 저장하면 채워진다)
        Agency agency = broker.getMember() == null ? null : agencyService.createIfAbsent(
                broker.getMember(),
                broker.getBusinessName(),
                broker.getOwnerName(),
                broker.getOfficeAddress(),
                null,
                null,
                broker.getLicenseNumber());

        if(agency != null){
            agency.setVerified(true); // 화면의 인증 마크는 이 값을 본다
        }

        return AdminBrokerDto.of(broker, agency);
    }

    // 반려 : 심사 중 -> 미인증 (사유를 남긴다)
    //
    // 미인증으로 되돌리는 이유는, 중개인이 반려 사유를 보고 고쳐서 다시 신청할 수 있어야 하기 때문이다.
    // (BrokerService.submit 은 VERIFIED 가 아니면 재신청을 허용하고, 재신청 시 이전 사유를 지운다)
    @Transactional
    public AdminBrokerDto reject(Long id, String reason){
        if(reason == null || reason.isBlank()){
            throw new IllegalArgumentException("반려 사유를 입력해 주세요.");
        }

        Broker broker = findPendingOrThrow(id);

        broker.setVerifyStatus(VerifyStatus.UNVERIFIED);
        broker.setRejectReason(reason.trim());
        broker.setReviewedAt(LocalDateTime.now());

        return AdminBrokerDto.of(broker, findAgency(broker));
    }

    // 승인·반려는 심사 중일 때만 할 수 있다.
    // 이미 처리한 신청을 두 번 누르거나, 목록을 새로고침하지 않은 채 눌렀을 때를 막는다.
    private Broker findPendingOrThrow(Long id){
        Broker broker = brokerRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("해당 인증 신청을 찾을 수 없습니다. id=" + id));

        if(broker.getVerifyStatus() != VerifyStatus.PENDING){
            throw new IllegalStateException("심사 중인 신청만 처리할 수 있습니다. 현재 상태 : " + broker.getVerifyStatus());
        }

        return broker;
    }

    // 중개인의 중개사무소를 찾는다. 아직 없으면 null 을 돌려준다.
    private Agency findAgency(Broker broker){
        if(broker.getMember() == null) return null;

        return agencyRepository.findByMemberId(broker.getMember().getId()).orElse(null);
    }

    // 문자열로 들어온 상태값을 열거형으로 바꾼다. 잘못된 값이면 안내 메시지를 준다.
    private VerifyStatus toStatus(String status){
        try {
            return VerifyStatus.valueOf(status.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("알 수 없는 상태값입니다 : " + status);
        }
    }
}
