package com.brentversal.agency.service;

import com.brentversal.agency.dto.AgencyReviewDto;
import com.brentversal.agency.dto.ReviewRequestDto;
import com.brentversal.agency.entity.Agency;
import com.brentversal.agency.entity.AgencyReview;
import com.brentversal.agency.repository.AgencyConsultationRepository;
import com.brentversal.agency.repository.AgencyRepository;
import com.brentversal.agency.repository.AgencyReviewRepository;
import com.brentversal.member.entity.Member;
import com.brentversal.member.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AgencyReviewService {
    private final AgencyReviewRepository agencyReviewRepository ;
    private final AgencyConsultationRepository agencyConsultationRepository ;
    private final AgencyRepository agencyRepository ;
    private final MemberRepository memberRepository ;

    // 중개사무소의 후기 목록 (최신순). 후기는 누구나 볼 수 있다.
    @Transactional(readOnly = true)
    public List<AgencyReviewDto> findByAgency(Long agencyId){
        return agencyReviewRepository.findByAgencyIdOrderByIdDesc(agencyId)
                .stream()
                .map(AgencyReviewDto::of)
                .toList();
    }

    // 이 회원이 이 사무소에 후기를 쓸 수 있는지 확인한다.
    // 조건 : 상담을 요청한 적이 있고, 아직 후기를 쓰지 않았을 것.
    @Transactional(readOnly = true)
    public boolean canWrite(Long agencyId, String email){
        Member member = memberRepository.findByEmail(email);
        if(member == null) return false;

        boolean hasConsulted = agencyConsultationRepository.existsByAgencyIdAndMemberId(agencyId, member.getId());
        boolean alreadyWrote = agencyReviewRepository.existsByAgencyIdAndMemberId(agencyId, member.getId());

        return hasConsulted && !alreadyWrote;
    }

    // 후기를 저장한다.
    // 상담 요청을 보낸 적이 있는 회원만 쓸 수 있다 (화면에서도 막지만 서버에서 다시 확인한다).
    @Transactional
    public Long create(Long agencyId, String email, ReviewRequestDto dto){
        if(dto.getRating() == null || dto.getRating() < 1 || dto.getRating() > 5){
            throw new IllegalArgumentException("별점은 1점에서 5점 사이로 선택해 주세요.");
        }

        if(dto.getContent() == null || dto.getContent().isBlank()){
            throw new IllegalArgumentException("후기 내용을 입력해 주세요.");
        }

        Agency agency = agencyRepository.findById(agencyId)
                .orElseThrow(() -> new IllegalArgumentException("해당 중개사무소를 찾을 수 없습니다."));

        Member member = memberRepository.findByEmail(email);
        if(member == null){
            throw new IllegalArgumentException("회원 정보를 찾을 수 없습니다.");
        }

        if(!agencyConsultationRepository.existsByAgencyIdAndMemberId(agencyId, member.getId())){
            throw new IllegalArgumentException("상담을 요청한 적이 있는 사용자만 후기를 남길 수 있습니다.");
        }

        if(agencyReviewRepository.existsByAgencyIdAndMemberId(agencyId, member.getId())){
            throw new IllegalArgumentException("이미 이 중개사무소에 후기를 남기셨습니다.");
        }

        AgencyReview bean = new AgencyReview();

        bean.setAgency(agency);
        bean.setMember(member);
        bean.setRating(dto.getRating());
        bean.setContent(dto.getContent());
        bean.setCreatedAt(LocalDateTime.now());

        agencyReviewRepository.save(bean);

        // 후기가 하나 늘었으므로 사무소의 평점 평균(rating_avg)을 다시 계산해서 저장한다.
        // 목록 화면의 별점이 이 값을 쓰기 때문에 여기서 같이 갱신해 주어야 한다.
        updateRatingAverage(agency);

        return bean.getId();
    }

    // 해당 사무소의 모든 후기 별점을 평균 내어 소수점 첫째 자리까지 저장한다.
    private void updateRatingAverage(Agency agency){
        List<AgencyReview> reviews = agencyReviewRepository.findByAgencyIdOrderByIdDesc(agency.getId());

        if(reviews.isEmpty()) return;

        double sum = reviews.stream().mapToInt(AgencyReview::getRating).sum();
        double average = sum / reviews.size();

        // 4.6666... 같은 값이 그대로 화면에 나가지 않도록 반올림한다
        agency.setRatingAvg(Math.round(average * 10) / 10.0);
        // 영속 상태의 엔터티라서 트랜잭션이 끝날 때 UPDATE 가 자동으로 실행된다
    }
}
