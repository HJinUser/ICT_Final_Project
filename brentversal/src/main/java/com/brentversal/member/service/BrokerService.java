package com.brentversal.member.service;

import com.brentversal.agency.service.AgencyService;
import com.brentversal.common.s3.service.FileService;
import com.brentversal.member.constant.VerifyStatus;
import com.brentversal.member.dto.BrokerVerificationDto;
import com.brentversal.member.entity.Broker;
import com.brentversal.member.entity.Member;
import com.brentversal.member.repository.BrokerRepository;
import com.brentversal.member.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.Optional;

// 중개사무소(중개인) 인증 신청을 처리하는 서비스
//
// 흐름 : 중개인이 정보 + 자격증 사진을 제출 -> 상태가 PENDING(심사 중)이 됨
//        -> 관리자가 디지털트윈국토에서 실제 사무소를 확인 -> 승인(VERIFIED) 또는 반려
@Service
@RequiredArgsConstructor
public class BrokerService {
    private final BrokerRepository brokerRepository ;
    private final MemberRepository memberRepository ;
    private final FileService fileService ; // 자격증 사진 저장용 (Common/S3)

    // 사무소가 없는 중개인이 인증을 신청하면 신청 정보로 사무소를 만들어 주기 위해 쓴다
    private final AgencyService agencyService ;

    // 로그인한 중개인의 인증 정보 조회.
    // 아직 중개인 정보가 없으면 비어 있는 Optional 을 돌려준다.
    @Transactional(readOnly = true)
    public Optional<BrokerVerificationDto> findMyVerification(String email){
        Member member = memberRepository.findByEmail(email);
        if(member == null) return Optional.empty();

        return brokerRepository.findByMemberId(member.getId())
                .map(BrokerVerificationDto::of);
    }

    // 인증 신청(또는 반려 후 재신청)을 저장한다.
    //
    // licenseImage 는 선택 사항이 아니라 필수다. 관리자가 자격증 사진과 입력값을 대조해야 하기 때문이다.
    // 다만 이미 제출한 사진이 있고 다시 올리지 않았다면 기존 사진을 그대로 둔다(재신청 시 편의).
    @Transactional
    public BrokerVerificationDto submit(String email, BrokerVerificationDto dto, MultipartFile licenseImage){
        Member member = memberRepository.findByEmail(email);
        if(member == null){
            throw new IllegalArgumentException("회원 정보를 찾을 수 없습니다.");
        }

        // 필수 입력값 확인. 화면에서도 막지만 요청을 직접 만들어 보낼 수 있으므로 서버에서 다시 본다.
        requireText(dto.getLicenseNumber(), "등록번호를 입력해 주세요.");
        requireText(dto.getBusinessName(), "상호를 입력해 주세요.");
        requireText(dto.getOfficeAddress(), "소재지를 입력해 주세요.");
        requireText(dto.getOwnerName(), "대표자를 입력해 주세요.");

        if(dto.getRegisteredDate() == null){
            throw new IllegalArgumentException("등록일을 선택해 주세요.");
        }

        // 중개인 정보가 없으면(일반 회원이 중개인 인증을 신청하는 경우) 새로 만든다.
        Broker broker = brokerRepository.findByMemberId(member.getId())
                .orElseGet(() -> {
                    Broker created = new Broker();
                    created.setMember(member);
                    return created;
                });

        // 이미 인증이 끝난 중개인은 다시 신청할 수 없다.
        if(broker.getVerifyStatus() == VerifyStatus.VERIFIED){
            throw new IllegalArgumentException("이미 인증이 완료된 중개사무소입니다.");
        }

        // 자격증 사진 저장. 새 파일이 오면 교체하고, 없으면 기존 것을 유지한다.
        if(licenseImage != null && !licenseImage.isEmpty()){
            broker.setLicenseImageUrl(fileService.upload(licenseImage));
        } else if(broker.getLicenseImageUrl() == null){
            throw new IllegalArgumentException("자격증 사진을 첨부해 주세요.");
        }

        broker.setLicenseNumber(dto.getLicenseNumber().trim());
        broker.setBusinessName(dto.getBusinessName().trim());
        broker.setOfficeAddress(dto.getOfficeAddress().trim());
        broker.setOwnerName(dto.getOwnerName().trim());
        broker.setRegisteredDate(dto.getRegisteredDate());

        broker.setVerifyStatus(VerifyStatus.PENDING); // 제출했으므로 심사 대기 상태로 바꾼다
        broker.setSubmittedAt(LocalDateTime.now());
        broker.setRejectReason(null); // 재신청이면 이전 반려 사유는 지운다
        broker.setReviewedAt(null);

        brokerRepository.save(broker);

        // 사무소가 아직 없으면(일반 회원으로 가입한 뒤 중개인 인증을 신청한 경우) 신청 정보로 만들어 준다.
        // 이 처리가 없으면 인증을 받아도 "내 중개사무소" 화면이 열리지 않는다.
        // 인증 마크(agency.verified)는 관리자가 승인할 때 붙으므로 여기서는 건드리지 않는다.
        agencyService.createIfAbsent(
                member,
                broker.getBusinessName(),  // 상호 -> 사무소 이름
                broker.getOwnerName(),     // 대표자 -> 대표 공인중개사
                broker.getOfficeAddress(), // 소재지 -> 사무소 주소
                dto.getOfficeSigungu(),    // 주소 검색이 함께 준 구
                dto.getOfficeDong(),       // 주소 검색이 함께 준 동
                broker.getLicenseNumber()  // 등록번호
        );

        return BrokerVerificationDto.of(broker);
    }

    // 빈 문자열 검사를 반복해서 쓰기 때문에 따로 뺐다.
    private void requireText(String value, String message){
        if(value == null || value.isBlank()){
            throw new IllegalArgumentException(message);
        }
    }
}
