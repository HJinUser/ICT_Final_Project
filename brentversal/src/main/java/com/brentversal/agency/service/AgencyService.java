package com.brentversal.agency.service;

import com.brentversal.agency.dto.AgencyResponseDto;
import com.brentversal.agency.entity.Agency;
import com.brentversal.agency.repository.AgencyRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class AgencyService { // AgencyService가 AgencyRepository를 의존하고 있음
    private final AgencyRepository agencyRepository; // 의존 + 무의미한 데이터여서 주입(injection)해야 함 + final로 변경

    // 중개사무소 목록 조회 (검색어 + 지역 필터)
    // readOnly = true : 조회 전용 트랜잭션이라 변경 감지(dirty checking)를 하지 않아 조금 더 가볍다.
    @Transactional(readOnly = true)
    public List<AgencyResponseDto> search(String keyword, String region){
        // 프론트에서 값을 안 보내면 null 로 들어오므로 빈 문자열로 바꿔 준다.
        // 리포지토리의 like '%%' 조건이 "조건 없음"으로 동작하게 하기 위함이다.
        String searchKeyword = (keyword == null) ? "" : keyword.trim();
        String searchRegion  = (region  == null) ? "" : region.trim();

        List<Agency> agencyList = agencyRepository.search(searchKeyword, searchRegion);

        // 엔터티 목록을 DTO 목록으로 변환해서 반환한다
        return agencyList.stream()
                .map(AgencyResponseDto::of)
                .toList();
    }

    // 중개사무소 1건 조회 (상세 페이지용)
    // 없는 id 일 수 있으므로 Optional 로 반환하고, 404 로 처리할지는 컨트롤러가 결정한다.
    @Transactional(readOnly = true)
    public Optional<AgencyResponseDto> findById(Long id){
        return agencyRepository.findById(id)
                .map(AgencyResponseDto::of);
    }

    // 인증 완료된 중개사무소 개수 (화면 상단 통계용)
    @Transactional(readOnly = true)
    public long countVerified(){
        return agencyRepository.countByVerifiedTrue();
    }
}
