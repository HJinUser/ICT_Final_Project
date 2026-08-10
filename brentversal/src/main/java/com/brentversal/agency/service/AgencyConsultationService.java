package com.brentversal.agency.service;

import com.brentversal.agency.dto.ConsultationRequestDto;
import com.brentversal.agency.entity.Agency;
import com.brentversal.agency.entity.AgencyConsultation;
import com.brentversal.agency.repository.AgencyConsultationRepository;
import com.brentversal.agency.repository.AgencyRepository;
import com.brentversal.member.entity.Member;
import com.brentversal.member.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class AgencyConsultationService {
    private final AgencyConsultationRepository agencyConsultationRepository ;
    private final AgencyRepository agencyRepository ;
    private final MemberRepository memberRepository ;

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

        return bean.getId();
    }
}
