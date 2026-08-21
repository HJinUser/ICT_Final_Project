package com.brentversal.agency.service;

import com.brentversal.agency.dto.ConsultationRequestDto;
import com.brentversal.agency.entity.Agency;
import com.brentversal.agency.entity.AgencyConsultation;
import com.brentversal.agency.repository.AgencyConsultationRepository;
import com.brentversal.agency.repository.AgencyRepository;
import com.brentversal.common.mail.MailService;
import com.brentversal.member.entity.Member;
import com.brentversal.member.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Slf4j
@Service
@RequiredArgsConstructor
public class AgencyConsultationService {
    private final AgencyConsultationRepository agencyConsultationRepository ;
    private final AgencyRepository agencyRepository ;
    private final MemberRepository memberRepository ;
    private final MailService mailService ;

    // 상담 요청을 저장한다.
    // email 은 로그인한 사용자의 이메일로, 컨트롤러가 JWT 에서 꺼내어 넘겨준다.
    // 잘못된 요청이면 IllegalArgumentException 을 던지고, 컨트롤러가 400 으로 바꿔서 응답한다.
    @Transactional
    public Long create(Long agencyId, String email, ConsultationRequestDto dto){
        // 내 정보 제공에 동의하지 않으면 요청을 받지 않는다.
        // 화면에서도 막고 있지만, 요청을 직접 만들어 보낼 수도 있으므로 서버에서 한 번 더 확인한다.
        if(!dto.isAgreed()){
            throw new IllegalArgumentException("내 정보 제공에 동의해야 상담을 요청할 수 있습니다.");
        }

        if(dto.getContent() == null || dto.getContent().isBlank()){
            throw new IllegalArgumentException("문의 내용을 입력해 주세요.");
        }

        Agency agency = agencyRepository.findById(agencyId)
                .orElseThrow(() -> new IllegalArgumentException("해당 중개사무소를 찾을 수 없습니다."));

        Member member = memberRepository.findByEmail(email);
        if(member == null){
            throw new IllegalArgumentException("회원 정보를 찾을 수 없습니다.");
        }

        AgencyConsultation bean = new AgencyConsultation();

        bean.setAgency(agency);
        bean.setMember(member);
        bean.setPropertyId(dto.getPropertyId());
        bean.setPreferredDate(dto.getPreferredDate());
        bean.setContent(dto.getContent());
        bean.setAgreed(true);
        bean.setCreatedAt(LocalDateTime.now());
        // status 는 엔터티에서 REQUESTED 로 초기화되어 있다

        agencyConsultationRepository.save(bean);

        // 상담을 받은 중개사무소(중개인)에게 새 문의가 왔다는 메일을 보낸다.
        notifyAgency(bean);

        return bean.getId();
    }

    // 상담 요청을 받은 중개사무소 회원에게 알림 메일을 보낸다.
    // 사무소에 아직 회원이 연결 안 됐거나 이메일이 없으면 조용히 건너뛴다.
    // 메일 발송 실패로 상담 등록 자체가 롤백되면 안 되므로 예외를 여기서 잡아 삼킨다.
    private void notifyAgency(AgencyConsultation consultation) {
        Member agencyMember = consultation.getAgency().getMember();
        if (agencyMember == null || agencyMember.getEmail() == null || agencyMember.getEmail().isBlank()) {
            return;
        }
        try {
            mailService.sendText(agencyMember.getEmail(),
                    "[전세역전] 새로운 상담 문의가 접수되었습니다",
                    "\"" + consultation.getAgency().getName() + "\"에 "
                            + consultation.getMember().getName() + "님의 새로운 상담 문의가 접수되었습니다.\n\n"
                            + "문의 내용: " + consultation.getContent());
        } catch (Exception e) {
            log.warn("상담 문의 알림 메일 발송 실패. consultationId={}, email={}",
                    consultation.getId(), agencyMember.getEmail(), e);
        }
    }
}