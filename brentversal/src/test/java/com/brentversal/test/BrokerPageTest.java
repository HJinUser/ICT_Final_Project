package com.brentversal.test;

import com.brentversal.agency.constant.ConsultationStatus;
import com.brentversal.agency.dto.ConsultationResponseDto;
import com.brentversal.agency.entity.Agency;
import com.brentversal.agency.entity.AgencyConsultation;
import com.brentversal.agency.repository.AgencyConsultationRepository;
import com.brentversal.agency.repository.AgencyRepository;
import com.brentversal.agency.service.MyAgencyService;
import com.brentversal.member.entity.Member;
import com.brentversal.member.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestConstructor;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// 중개인 전용 화면(내 중개사무소, 문의 답변, 리뷰 관리)이 제대로 동작하는지 확인하는 테스트
@SpringBootTest
@AutoConfigureMockMvc // 실제 서버를 띄우지 않고 컨트롤러 + 시큐리티 필터까지 그대로 확인한다
@RequiredArgsConstructor
@TestConstructor(autowireMode = TestConstructor.AutowireMode.ALL)
public class BrokerPageTest {
    private final MockMvc mockMvc ;
    private final MyAgencyService myAgencyService ;
    private final AgencyRepository agencyRepository ;
    private final AgencyConsultationRepository agencyConsultationRepository ;
    private final MemberRepository memberRepository ;

    // 중개인 전용 경로는 로그인하지 않으면 접근할 수 없어야 한다.
    // (SecurityConfig 에서 /my-agency/** 를 ROLE_BROKER 로 막아 두었다)
    @Test
    @DisplayName("중개인 전용 API 는 비로그인 상태에서 401 이어야 한다")
    void myAgencyNeedsLogin() throws Exception {
        mockMvc.perform(get("/my-agency")).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/my-agency/dashboard")).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/my-agency/consultations")).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/my-agency/reviews")).andExpect(status().isUnauthorized());

        mockMvc.perform(post("/my-agency/consultations/1/reply")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reply\":\"답변입니다\"}"))
                .andExpect(status().isUnauthorized());
    }

    // 중개인 인증 신청도 로그인이 필요하다
    @Test
    @DisplayName("중개인 인증 API 는 비로그인 상태에서 401 이어야 한다")
    void brokerVerificationNeedsLogin() throws Exception {
        mockMvc.perform(get("/broker/verification")).andExpect(status().isUnauthorized());
    }

    // 문의 목록 조회 -> 답변 -> 상태 변경까지의 흐름을 서비스 계층에서 확인한다.
    // @Transactional 이라 테스트가 끝나면 저장한 내용은 모두 되돌려진다.
    @Test
    @Transactional
    @DisplayName("상담 요청에 답변하면 상태가 '상담 확정'으로 바뀐다")
    void replyToConsultation(){
        Member member = findBrokerWithAgency();
        Agency agency = agencyRepository.findByMemberId(member.getId()).orElseThrow();

        // 상담 요청 1건을 직접 만들어 넣는다
        AgencyConsultation consultation = new AgencyConsultation();
        consultation.setAgency(agency);
        consultation.setMember(member);
        consultation.setContent("반포동 전세 매물 문의드립니다.");
        consultation.setAgreed(true);
        consultation.setCreatedAt(LocalDateTime.now());
        agencyConsultationRepository.save(consultation);

        String email = member.getEmail();

        // 목록에 방금 넣은 요청이 보여야 한다
        List<ConsultationResponseDto> requested = myAgencyService.getMyConsultations(email, "REQUESTED");
        Assertions.assertFalse(requested.isEmpty(), "상담 요청 문의가 보여야 한다");

        // 요청한 사람의 연락처가 함께 내려와야 중개인이 직접 연락할 수 있다
        Assertions.assertNotNull(requested.get(0).getMemberName());

        // 답변을 저장하면 '상담 요청'에서 '상담 확정(ACCEPTED)'으로 넘어간다
        ConsultationResponseDto replied =
                myAgencyService.replyToConsultation(email, consultation.getId(), "안녕하세요. 방문 상담 가능합니다.");

        Assertions.assertEquals(ConsultationStatus.ACCEPTED.name(), replied.getStatus());
        Assertions.assertNotNull(replied.getRepliedAt());

        // 빈 답변은 저장되지 않아야 한다
        Assertions.assertThrows(IllegalArgumentException.class,
                () -> myAgencyService.replyToConsultation(email, consultation.getId(), "   "));

        System.out.println("답변 후 상태 : " + replied.getStatusLabel());
    }

    // 대시보드 숫자가 계산되는지 확인한다
    @Test
    @Transactional
    @DisplayName("대시보드에 매물·문의·평점 숫자가 채워진다")
    void dashboard(){
        Member member = findBrokerWithAgency();

        var dashboard = myAgencyService.getDashboard(member.getEmail());

        System.out.println("게시중 " + dashboard.getActiveCount()
                + " / 상담요청 " + dashboard.getRequestedConsultationCount()
                + " / 평점 " + dashboard.getRatingAvg());

        // 건수는 음수가 될 수 없다
        Assertions.assertTrue(dashboard.getActiveCount() >= 0);
        Assertions.assertTrue(dashboard.getRatingAvg() >= 0);
    }

    // 중개사무소를 가진 회원(중개인)을 찾는다.
    //
    // agency.member_id 에는 unique 제약이 있어서(중개인 1명이 사무소 1개),
    // 테스트에서 아무 사무소에나 회원을 붙이면 이미 사무소를 가진 회원과 충돌한다.
    // 그래서 이미 사무소를 가진 회원을 찾아 그 사람으로 확인한다.
    //
    // agency.getMember() 로 찾지 않는 이유:
    // 회원이 지워졌는데 agency.member_id 만 남아 있는 데이터가 있으면
    // 지연 로딩된 회원을 꺼내는 순간 EntityNotFoundException 이 난다.
    // 회원 쪽에서 사무소를 찾아 들어가면 그런 데이터를 자연스럽게 건너뛸 수 있다.
    private Member findBrokerWithAgency(){
        for(Member member : memberRepository.findAll()){
            if(agencyRepository.findByMemberId(member.getId()).isPresent()){
                return member;
            }
        }

        // 조건에 맞는 데이터가 없으면 실패가 아니라 '건너뜀'으로 처리한다
        return Assumptions.abort(
                "중개사무소를 가진 회원이 없어 이 테스트는 건너뜁니다. (중개인 계정으로 사무소를 등록한 뒤 다시 실행하세요)");
    }
}
