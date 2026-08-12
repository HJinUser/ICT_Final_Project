package com.brentversal.agency.service;

import com.brentversal.agency.dto.MyConsultationDto;
import com.brentversal.agency.entity.AgencyConsultation;
import com.brentversal.agency.repository.AgencyConsultationRepository;
import com.brentversal.member.entity.Member;
import com.brentversal.member.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

// 사용자가 자기가 보낸 상담과 그 답변을 보는 화면("내 상담")의 서비스
//
// 중개인 쪽(MyAgencyService)과 방향이 반대다.
//   중개인 : 내 사무소로 들어온 상담을 본다
//   사용자 : 내가 보낸 상담과 받은 답변을 본다
//
// 상담 id 를 받더라도 항상 "내가 보낸 상담이 맞는지"를 확인한다.
// 그래야 id 만 바꿔서 남의 상담과 답변을 들여다보는 일을 막을 수 있다.
@Service
@RequiredArgsConstructor
public class MemberConsultationService {
    private final AgencyConsultationRepository agencyConsultationRepository ;
    private final MemberRepository memberRepository ;

    // 내가 보낸 상담 전체 (최신순)
    @Transactional(readOnly = true)
    public List<MyConsultationDto> getMyConsultations(String email){
        Member member = findMemberOrThrow(email);

        return agencyConsultationRepository.findByMemberIdOrderByCreatedAtDesc(member.getId())
                .stream()
                .map(MyConsultationDto::of)
                .toList();
    }

    // 답변이 왔는데 아직 확인하지 않은 상담. 헤더 알림에서 쓴다.
    @Transactional(readOnly = true)
    public List<AgencyConsultation> findUncheckedReplies(Long memberId){
        return agencyConsultationRepository
                .findByMemberIdAndReplyIsNotNullAndReplyCheckedAtIsNullOrderByRepliedAtDesc(memberId);
    }

    // 답변을 확인했다고 표시한다.
    // 화면에서 답변을 펼쳐 볼 때 호출하며, 이 시점부터 알림 목록에서 사라진다.
    @Transactional
    public MyConsultationDto checkReply(String email, Long consultationId){
        Member member = findMemberOrThrow(email);

        AgencyConsultation bean = agencyConsultationRepository.findById(consultationId)
                .orElseThrow(() -> new IllegalArgumentException("해당 상담을 찾을 수 없습니다."));

        // 남의 상담을 확인 처리하지 못하게 막는다
        if(!bean.getMember().getId().equals(member.getId())){
            throw new IllegalArgumentException("내가 보낸 상담이 아닙니다.");
        }

        // 아직 답변이 없으면 확인할 것도 없다
        if(bean.getReply() == null){
            throw new IllegalArgumentException("아직 답변이 도착하지 않았습니다.");
        }

        // 이미 확인한 상담은 시각을 덮어쓰지 않는다 (처음 본 시점을 남겨 둔다)
        if(bean.getReplyCheckedAt() == null){
            bean.setReplyCheckedAt(LocalDateTime.now());
        }

        return MyConsultationDto.of(bean);
    }

    private Member findMemberOrThrow(String email){
        Member member = memberRepository.findByEmail(email);

        if(member == null){
            throw new IllegalArgumentException("회원 정보를 찾을 수 없습니다.");
        }

        return member;
    }
}
