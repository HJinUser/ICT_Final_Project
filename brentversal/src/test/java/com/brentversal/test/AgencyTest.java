package com.brentversal.test;

import com.brentversal.agency.dto.AgencyResponseDto;
import com.brentversal.agency.dto.ConsultationRequestDto;
import com.brentversal.agency.dto.ReviewRequestDto;
import com.brentversal.agency.repository.AgencyRepository;
import com.brentversal.agency.service.AgencyConsultationService;
import com.brentversal.agency.service.AgencyReviewService;
import com.brentversal.agency.service.AgencyService;
import com.brentversal.member.entity.Member;
import com.brentversal.member.repository.MemberRepository;
import org.springframework.http.MediaType;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import lombok.RequiredArgsConstructor;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestConstructor;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;

import java.util.List;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// 중개사무소 조회 기능이 실제로 잘 작동하는지 확인하는 테스트 클래스
// resources/data.sql 이 예시 데이터를 넣어 주므로, 테이블이 비어 있어도 결과가 나온다.
@SpringBootTest
@AutoConfigureMockMvc // 실제 서버를 띄우지 않고 컨트롤러 + 시큐리티 필터까지 그대로 테스트한다
@RequiredArgsConstructor
@TestConstructor(autowireMode = TestConstructor.AutowireMode.ALL)
public class AgencyTest {
    private final AgencyService agencyService ;
    private final AgencyRepository agencyRepository ;
    private final MockMvc mockMvc ;

    // 상세 페이지(상담 요청·이용자 평가) 확인용
    private final AgencyConsultationService agencyConsultationService ;
    private final AgencyReviewService agencyReviewService ;
    private final MemberRepository memberRepository ;

    @Test
    @DisplayName("중개사무소 전체 목록 조회")
    void searchAll(){
        // 검색어와 지역을 안 넘기면(null) 전체 목록이 나와야 한다
        List<AgencyResponseDto> list = agencyService.search(null, null);

        System.out.println("전체 중개사무소 수 : " + list.size());
        for(AgencyResponseDto dto : list){
            System.out.println(dto.getId() + " | " + dto.getName() + " | " + dto.getBrokerName()
                    + " | " + dto.getAddress() + " | " + dto.getStatusLabel()
                    + " | 매물 " + dto.getListingCount() + "건 | 평점 " + dto.getRatingAvg());
        }

        Assertions.assertFalse(list.isEmpty(), "중개사무소 목록이 비어 있으면 안 된다");
    }

    @Test
    @DisplayName("검색어와 지역으로 중개사무소 조회")
    void searchByKeywordAndRegion(){
        // 사무소명에 '반포'가 들어가고 주소에 '서초구'가 들어가는 사무소
        List<AgencyResponseDto> list = agencyService.search("반포", "서초구");

        System.out.println("검색 결과 수 : " + list.size());
        list.forEach(dto -> System.out.println(dto.getName() + " / " + dto.getAddress()));

        // 검색 결과는 모두 조건을 만족해야 한다
        for(AgencyResponseDto dto : list){
            Assertions.assertTrue(dto.getName().contains("반포") || dto.getBrokerName().contains("반포"));
            Assertions.assertTrue(dto.getAddress().contains("서초구"));
        }
    }

    @Test
    @DisplayName("인증 완료된 중개사무소 개수 조회")
    void countVerified(){
        long verifiedCount = agencyService.countVerified();

        System.out.println("인증 중개사무소 수 : " + verifiedCount);

        // 인증된 사무소 수는 전체 사무소 수보다 많을 수 없다
        Assertions.assertTrue(verifiedCount <= agencyRepository.count());
    }

    // 아래 두 개는 프론트엔드(AgencyPage.tsx)가 실제로 호출하는 주소를 그대로 확인하는 테스트다.
    // 로그인하지 않은 상태(비회원)에서도 200 이 나와야 화면이 보인다.
    @Test
    @DisplayName("GET /agency - 비회원도 목록을 조회할 수 있어야 한다")
    void listApi() throws Exception {
        mockMvc.perform(get("/agency"))
                .andExpect(status().isOk())
                // 프론트가 사용하는 필드 이름이 그대로 내려오는지 확인한다
                .andExpect(jsonPath("$.content").isArray())
                .andExpect(jsonPath("$.content[0].name").exists())
                .andExpect(jsonPath("$.content[0].brokerName").exists())
                .andExpect(jsonPath("$.content[0].statusLabel").exists())
                .andExpect(jsonPath("$.content[0].listingCount").exists())
                .andExpect(jsonPath("$.verifiedCount").exists());
    }

    @Test
    @DisplayName("GET /agency/{id} - 없는 id 는 404 를 돌려줘야 한다")
    void detailApi() throws Exception {
        Long id = agencyRepository.findAll().get(0).getId();

        mockMvc.perform(get("/agency/" + id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id));

        mockMvc.perform(get("/agency/99999999"))
                .andExpect(status().isNotFound());
    }

    // ── 중개사무소 상세 페이지에서 쓰는 API ──────────────────────────
    @Test
    @DisplayName("GET /agency/{id} - 상세 화면에 필요한 값이 모두 들어 있어야 한다")
    void detailApiFields() throws Exception {
        // 1번은 data.sql 로 넣은 반포역전 공인중개사 (매물 2건이 함께 등록돼 있다)
        mockMvc.perform(get("/agency/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.registrationNo").exists())   // 등록번호
                .andExpect(jsonPath("$.hours").exists())            // 영업시간
                .andExpect(jsonPath("$.imageUrls").isArray())       // 갤러리 이미지
                .andExpect(jsonPath("$.listingCount").exists())     // 담당 매물 전체 건수
                .andExpect(jsonPath("$.todayNewCount").exists())    // 오늘 신규
                .andExpect(jsonPath("$.recentProperties").isArray())
                .andExpect(jsonPath("$.recentProperties[0].priceLabel").exists()) // "전세 4억 9,000"
                .andExpect(jsonPath("$.recentProperties[0].dong").exists())
                // 매물 카드를 누르면 매물 상세로 이동해야 하므로 id 가 제대로 들어와야 하고,
                // 서로 다른 매물이 나와야 한다
                .andExpect(jsonPath("$.recentProperties[0].id").value(org.hamcrest.Matchers.greaterThan(0)))
                .andExpect(jsonPath("$.recentProperties[1].id")
                        .value(org.hamcrest.Matchers.not(org.hamcrest.Matchers.is(1))));
    }

    @Test
    @DisplayName("GET /agency/{id}/reviews - 후기 목록은 비회원도 볼 수 있어야 한다")
    void reviewListApi() throws Exception {
        mockMvc.perform(get("/agency/1/reviews"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    @DisplayName("상담 요청·후기 작성은 로그인하지 않으면 401 이어야 한다")
    void writeApiNeedsLogin() throws Exception {
        mockMvc.perform(post("/agency/1/consultations")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\":\"문의합니다\",\"agreed\":true}"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(post("/agency/1/reviews")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"rating\":5,\"content\":\"좋았습니다\"}"))
                .andExpect(status().isUnauthorized());
    }

    // 상담 요청 -> 후기 작성 자격 -> 후기 작성까지의 흐름을 확인한다.
    // @Transactional 이 붙어 있어서 테스트가 끝나면 저장한 내용은 모두 되돌려진다(DB 가 더러워지지 않는다).
    @Test
    @Transactional
    @DisplayName("상담을 요청한 회원만 후기를 쓸 수 있다")
    void consultationAndReviewFlow(){
        // 이미 가입돼 있는 회원 한 명으로 흐름을 확인한다.
        // (테스트가 끝나면 @Transactional 로 되돌려지므로 이 회원의 데이터는 남지 않는다)
        List<Member> members = memberRepository.findAll();
        Assumptions.assumeFalse(members.isEmpty(), "members 테이블에 회원이 없어 이 테스트는 건너뜁니다.");

        String email = members.get(0).getEmail();
        Long agencyId = agencyRepository.findAll().get(0).getId();

        // 상담을 요청하기 전에는 후기를 쓸 수 없다
        Assertions.assertFalse(agencyReviewService.canWrite(agencyId, email));

        // 동의하지 않으면 상담 요청이 저장되지 않는다
        ConsultationRequestDto notAgreed = new ConsultationRequestDto();
        notAgreed.setContent("문의합니다");
        notAgreed.setAgreed(false);
        Assertions.assertThrows(IllegalArgumentException.class,
                () -> agencyConsultationService.create(agencyId, email, notAgreed));

        // 정상적인 상담 요청
        ConsultationRequestDto request = new ConsultationRequestDto();
        request.setContent("반포동 전세 매물 상담을 받고 싶습니다.");
        request.setPreferredDate(LocalDate.now().plusDays(1));
        request.setAgreed(true);
        Long consultationId = agencyConsultationService.create(agencyId, email, request);
        Assertions.assertNotNull(consultationId);

        // 이제 후기를 쓸 수 있다
        Assertions.assertTrue(agencyReviewService.canWrite(agencyId, email));

        ReviewRequestDto review = new ReviewRequestDto();
        review.setRating(5);
        review.setContent("매물 장단점을 솔직하게 설명해 주셨습니다.");
        Assertions.assertNotNull(agencyReviewService.create(agencyId, email, review));

        // 같은 사무소에 두 번은 쓸 수 없다
        Assertions.assertFalse(agencyReviewService.canWrite(agencyId, email));
        Assertions.assertThrows(IllegalArgumentException.class,
                () -> agencyReviewService.create(agencyId, email, review));

        System.out.println("후기 개수 : " + agencyReviewService.findByAgency(agencyId).size());
    }

}
