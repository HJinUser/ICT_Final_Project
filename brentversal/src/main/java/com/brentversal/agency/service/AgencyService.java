package com.brentversal.agency.service;

import com.brentversal.agency.dto.AgencyDetailDto;
import com.brentversal.agency.dto.AgencyPropertyDto;
import com.brentversal.agency.dto.AgencyResponseDto;
import com.brentversal.agency.entity.Agency;
import com.brentversal.agency.repository.AgencyRepository;
import com.brentversal.agency.repository.AgencyReviewRepository;
import com.brentversal.common.geocoding.KakaoGeocodingService;
import com.brentversal.member.entity.Member;
import com.brentversal.property.constant.PropertyStatus;
import com.brentversal.property.repository.PropertyRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class AgencyService { // AgencyService가 AgencyRepository를 의존하고 있음
    private final AgencyRepository agencyRepository; // 의존 + 무의미한 데이터여서 주입(injection)해야 함 + final로 변경

    // 상세 페이지에서 담당 매물과 후기 개수를 함께 보여줘야 해서 두 리포지토리를 더 주입받는다
    private final PropertyRepository propertyRepository;
    private final AgencyReviewRepository agencyReviewRepository;

    // 사무소를 새로 만들 때 주소로 좌표(위도·경도)를 채우기 위해 쓴다
    private final KakaoGeocodingService kakaoGeocodingService;

    // 상세 페이지에 카드로 보여 줄 최근 매물 개수
    private static final int RECENT_PROPERTY_LIMIT = 2;

    // 중개인에게 사무소가 없으면 인증 신청 정보로 만들어 준다. 이미 있으면 그대로 돌려준다.
    //
    // 사무소는 원래 중개인 회원가입(MemberService.saveBrokerProfile)에서 함께 만들어진다.
    // 하지만 일반 회원으로 가입한 뒤 중개인 인증을 신청하는 길도 열려 있어서,
    // 그 경우에는 사무소 없이 중개인 자격만 생겨 "내 중개사무소" 화면이 열리지 않았다.
    // 인증 신청 때 받는 상호·소재지·대표자가 사무소에 필요한 값과 같으므로 그대로 사용한다.
    @Transactional
    public Agency createIfAbsent(Member member, String name, String brokerName,
                                 String address, String sigungu, String dong, String registrationNo){

        Optional<Agency> found = agencyRepository.findByMemberId(member.getId());

        if(found.isPresent()) return found.get();

        Agency agency = new Agency();

        agency.setMember(member);
        agency.setName(name);
        agency.setBrokerName(brokerName);
        agency.setAddress(address);
        agency.setSigungu(sigungu);
        agency.setDong(dong);
        agency.setRegistrationNo(registrationNo);
        agency.setRegdate(LocalDate.now());

        // 좌표를 못 찾아도(카카오 키가 없거나 검색 실패) 사무소 등록은 정상적으로 끝나야 한다.
        // 지도에 안 보일 뿐이고, 나중에 사무소 정보를 저장할 때 다시 채워진다.
        kakaoGeocodingService.findCoordinates(address).ifPresent(coordinates -> {
            agency.setLatitude(coordinates.latitude());
            agency.setLongitude(coordinates.longitude());
        });

        return agencyRepository.save(agency);
    }

    // 중개사무소 목록 조회 (검색어 + 지역(구·동) 필터)
    // readOnly = true : 조회 전용 트랜잭션이라 변경 감지(dirty checking)를 하지 않아 조금 더 가볍다.
    @Transactional(readOnly = true)
    public List<AgencyResponseDto> search(String keyword, String region, String dong){
        // 프론트에서 값을 안 보내면 null 로 들어오므로 빈 문자열로 바꿔 준다.
        // 리포지토리의 like '%%' 조건이 "조건 없음"으로 동작하게 하기 위함이다.
        String searchKeyword = (keyword == null) ? "" : keyword.trim();
        String searchRegion  = (region  == null) ? "" : region.trim();
        String searchDong    = (dong    == null) ? "" : dong.trim();

        List<Agency> agencyList = agencyRepository.search(searchKeyword, searchRegion, searchDong);

        // 엔터티 목록을 DTO 목록으로 변환해서 반환한다.
        //
        // 담당 매물 건수는 agency 테이블의 listing_count 컬럼이 아니라 property 테이블을 실제로 센다.
        // 컬럼 값은 예시 데이터에 박혀 있을 뿐 실제 매물 수와 맞지 않아서,
        // 목록에서 "24건"을 보고 들어갔는데 상세는 "2건"으로 나오는 일이 있었다.
        // 상세(findDetailById)와 같은 조건(게시중 + 공개)으로 세어 두 화면의 숫자를 맞춘다.
        return agencyList.stream()
                .map(agency -> {
                    AgencyResponseDto dto = AgencyResponseDto.of(agency);

                    dto.setListingCount((int) propertyRepository
                            .countByAgencyIdAndStatusAndVisibleTrue(agency.getId(), PropertyStatus.ACTIVE));

                    return dto;
                })
                .toList();
    }

    // 중개사무소 1건 조회 (요약)
    // 없는 id 일 수 있으므로 Optional 로 반환하고, 404 로 처리할지는 컨트롤러가 결정한다.
    @Transactional(readOnly = true)
    public Optional<AgencyResponseDto> findById(Long id){
        return agencyRepository.findById(id)
                .map(AgencyResponseDto::of);
    }

    // 중개사무소 상세 조회 (상세 페이지용)
    // 사무소 정보 + 담당 매물(건수·오늘 신규·최근 2건) + 후기 개수를 한 번에 담아 준다.
    // 화면이 여러 번 요청하지 않도록 여기서 모아서 내려 주는 것이다.
    @Transactional(readOnly = true)
    public Optional<AgencyDetailDto> findDetailById(Long id){
        return agencyRepository.findById(id).map(agency -> {
            AgencyDetailDto dto = AgencyDetailDto.of(agency);

            // 게시중(ACTIVE)이고 공개 상태인 매물만 화면에 보여 준다
            dto.setListingCount(propertyRepository.countByAgencyIdAndStatusAndVisibleTrue(id, PropertyStatus.ACTIVE));

            // 오늘 0시 이후에 등록된 매물을 오늘 신규로 센다
            LocalDateTime todayStart = LocalDate.now().atStartOfDay();
            dto.setTodayNewCount(propertyRepository
                    .countByAgencyIdAndStatusAndVisibleTrueAndCreatedAtAfter(id, PropertyStatus.ACTIVE, todayStart));

            // 담당 매물 전체. 상담 요청 폼에서 문의할 매물을 고를 때 쓴다.
            List<AgencyPropertyDto> properties = propertyRepository
                    .findByAgencyIdAndStatusAndVisibleTrueOrderByCreatedAtDesc(id, PropertyStatus.ACTIVE)
                    .stream()
                    .map(AgencyPropertyDto::of)
                    .toList();
            dto.setProperties(properties);

            // 그중 가장 최근 것 몇 건만 카드로 보여 준다
            dto.setRecentProperties(properties.stream().limit(RECENT_PROPERTY_LIMIT).toList());

            dto.setReviewCount(agencyReviewRepository.countByAgencyId(id));

            return dto;
        });
    }

    // 인증 완료된 중개사무소 개수 (화면 상단 통계용)
    @Transactional(readOnly = true)
    public long countVerified(){
        return agencyRepository.countByVerifiedTrue();
    }
}
