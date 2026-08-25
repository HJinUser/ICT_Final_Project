package com.brentversal.inquiry.service;

import com.brentversal.common.mail.MailService;
import com.brentversal.inquiry.constant.InquiryStatus;
import com.brentversal.inquiry.dto.InquiryCreateRequestDto;
import com.brentversal.inquiry.entity.Inquiry;
import com.brentversal.inquiry.repository.InquiryRepository;
import com.brentversal.member.entity.Member;
import com.brentversal.member.repository.MemberRepository;
import com.brentversal.property.entity.Property;
import com.brentversal.property.repository.PropertyRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Slf4j
@Service
@RequiredArgsConstructor
public class InquiryService {

    private final InquiryRepository inquiryRepository;
    private final MemberRepository memberRepository;
    private final PropertyRepository propertyRepository;
    private final MailService mailService;

    @Transactional
    public Long create(String email, InquiryCreateRequestDto dto) {
        Member member = memberRepository.findByEmail(email);
        if (member == null) {
            throw new IllegalArgumentException("회원 정보를 찾을 수 없습니다.");
        }

        Property property = propertyRepository.findById(dto.getPropertyId())
                .orElseThrow(() -> new IllegalArgumentException("문의할 매물을 찾을 수 없습니다."));

        Inquiry inquiry = new Inquiry();
        inquiry.setMember(member);
        inquiry.setProperty(property);
        inquiry.setTitle(dto.getTitle());
        inquiry.setContent(dto.getContent());
        inquiry.setStatus(InquiryStatus.PENDING);
        inquiry.setCreatedAt(LocalDateTime.now());

        inquiryRepository.save(inquiry);

        notifyAgency(inquiry);

        return inquiry.getId();
    }

    private void notifyAgency(Inquiry inquiry) {
        Member agencyMember = inquiry.getProperty().getAgency().getMember();
        if (agencyMember == null || agencyMember.getEmail() == null || agencyMember.getEmail().isBlank()) {
            return;
        }
        try {
            mailService.sendText(agencyMember.getEmail(),
                    "[전세역전] 새로운 문의가 접수되었습니다",
                    "\"" + inquiry.getProperty().getName() + "\" 매물에 "
                            + inquiry.getMember().getName() + "님의 새로운 문의가 접수되었습니다.\n\n"
                            + "제목: " + inquiry.getTitle() + "\n"
                            + "내용: " + inquiry.getContent());
        } catch (Exception e) {
            log.warn("문의 알림 메일 발송 실패. inquiryId={}, email={}",
                    inquiry.getId(), agencyMember.getEmail(), e);
        }
    }
}
