package com.brentversal.test;

import com.brentversal.Agency.dto.AgencyResponseDto;
import com.brentversal.Agency.repository.AgencyRepository;
import com.brentversal.Agency.service.AgencyService;
import lombok.RequiredArgsConstructor;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestConstructor;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;

import java.util.List;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
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
}
