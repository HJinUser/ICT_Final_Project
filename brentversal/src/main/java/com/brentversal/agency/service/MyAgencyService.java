package com.brentversal.agency.service;

import com.brentversal.agency.constant.ConsultationStatus;
import com.brentversal.agency.dto.*;
import com.brentversal.agency.entity.Agency;
import com.brentversal.agency.entity.AgencyConsultation;
import com.brentversal.agency.entity.AgencyReview;
import com.brentversal.agency.repository.AgencyConsultationRepository;
import com.brentversal.agency.repository.AgencyRepository;
import com.brentversal.agency.repository.AgencyReviewRepository;
import com.brentversal.common.geocoding.KakaoGeocodingService;
import com.brentversal.member.entity.Member;
import com.brentversal.favorite.repository.FavoriteRepository;
import com.brentversal.member.repository.MemberRepository;
import com.brentversal.property.constant.PropertyStatus;
import com.brentversal.property.entity.Property;
import com.brentversal.property.repository.PropertyRepository;
import com.brentversal.recommendation.constant.RecommendationFeedbackType;
import com.brentversal.recommendation.repository.RecommendationFeedbackRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

// 로그인한 중개인이 자기 사무소를 관리하는 화면("내 중개사무소", 중개인 마이페이지)의 서비스
//
// 이 서비스의 모든 메소드는 이메일(로그인한 사람)을 받아서 그 사람의 사무소를 찾는다.
// 사무소 id 를 파라미터로 받지 않는 이유는, 남의 사무소 id 를 넣어 조회하는 일을 원천적으로 막기 위해서다.
@Service
@RequiredArgsConstructor
public class MyAgencyService {
    private final AgencyRepository agencyRepository ;
    private final AgencyConsultationRepository agencyConsultationRepository ;
    private final AgencyReviewRepository agencyReviewRepository ;
    private final PropertyRepository propertyRepository ;
    private final MemberRepository memberRepository ;

    // 중개인 홈의 "매물 반응 추이" · "머신러닝 평가" 에서 쓴다.
    // 관심 등록과 추천 평가는 각자 다른 도메인이 갖고 있어서 여기서 함께 읽어 한 화면 자료로 만든다.
    private final FavoriteRepository favoriteRepository ;
    private final RecommendationFeedbackRepository recommendationFeedbackRepository ;

    // 사무소 주소를 저장할 때 위도·경도를 채우기 위해 쓴다 (카카오 로컬 API)
    private final KakaoGeocodingService kakaoGeocodingService ;

    // 등록 매물 카드는 2행 3열이라 한 페이지에 6개, 리뷰는 한 페이지에 10개씩 보여 준다.
    private static final int PROPERTY_PAGE_SIZE = 6 ;
    private static final int REVIEW_PAGE_SIZE = 10 ;

    // 반응 추이는 최근 6개월을 보여 준다 (그 이상은 메인 화면의 작은 카드에 담기지 않는다).
    private static final int TREND_MONTHS = 6 ;

    // 메인 화면 카드에 걸어 둘 매물 수. 전체는 각 관리 화면에서 본다.
    private static final int INSIGHT_ITEM_LIMIT = 3 ;

    // 로그인한 사람의 중개사무소를 찾는다.
    // 사무소가 아직 없으면(인증 전이거나 등록 전) 예외를 던지고, 컨트롤러가 404 로 바꿔서 응답한다.
    @Transactional(readOnly = true)
    public Agency findMyAgency(String email){
        Member member = memberRepository.findByEmail(email);

        if(member == null){
            throw new IllegalArgumentException("회원 정보를 찾을 수 없습니다.");
        }

        return agencyRepository.findByMemberId(member.getId())
                .orElseThrow(() -> new IllegalArgumentException("등록된 중개사무소가 없습니다. 중개사무소 인증을 먼저 진행해 주세요."));
    }

    // 상단 요약(대시보드)에 쓰는 숫자들을 한 번에 모아 준다.
    @Transactional(readOnly = true)
    public MyAgencyDashboardDto getDashboard(String email){
        Agency agency = findMyAgency(email);
        Long agencyId = agency.getId();
        MyAgencyDashboardDto dto = new MyAgencyDashboardDto();
        // 매물 현황
        // Repository를 통해 필요한 DB 데이터를 조회/변경함
        dto.setTotalCount(
                propertyRepository.countByAgencyIdAndStatusNot(
                        agencyId,
                        PropertyStatus.DRAFT
                )
        );
        dto.setActiveCount(propertyRepository.countByAgencyIdAndStatus(agencyId, PropertyStatus.ACTIVE));
        dto.setInProgressCount(propertyRepository.countByAgencyIdAndStatus(agencyId, PropertyStatus.IN_PROGRESS));
        dto.setCompletedCount(propertyRepository.countByAgencyIdAndStatus(agencyId, PropertyStatus.COMPLETED));
        dto.setPendingCount(propertyRepository.countByAgencyIdAndStatus(agencyId, PropertyStatus.PENDING));
        // 문의 현황
        dto.setRequestedConsultationCount(
                agencyConsultationRepository.countByAgencyIdAndStatus(agencyId, ConsultationStatus.REQUESTED));
        dto.setAcceptedConsultationCount(
                agencyConsultationRepository.countByAgencyIdAndStatus(agencyId, ConsultationStatus.ACCEPTED));
        dto.setDoneConsultationCount(
                agencyConsultationRepository.countByAgencyIdAndStatus(agencyId, ConsultationStatus.DONE));

        // 평가 현황
        dto.setRatingAvg(agency.getRatingAvg() == null ? 0.0 : agency.getRatingAvg());
        dto.setReviewCount(agencyReviewRepository.countByAgencyId(agencyId));
        dto.setUnansweredReviewCount(agencyReviewRepository.countByAgencyIdAndReplyIsNull(agencyId));

        return dto;
    }

    // 내가 등록한 매물 목록 (한 페이지 6개)
    @Transactional(readOnly = true)
    public Page<MyPropertyCardDto> getMyProperties(String email, int page){
        Agency agency = findMyAgency(email);

        // PageRequest.of(페이지번호, 한페이지크기) - 페이지 번호는 0부터 시작한다
        Pageable pageable = PageRequest.of(Math.max(0, page), PROPERTY_PAGE_SIZE);

        return propertyRepository.findByAgencyIdAndStatusNotOrderByCreatedAtDesc(
                agency.getId(),
                PropertyStatus.DRAFT,
                pageable
        ).map(MyPropertyCardDto::of);
    }


    // 내 사무소로 들어온 상담 요청 목록
    // status 가 null 이거나 "ALL" 이면 전체를 보여 준다 (문의 관리 필터의 기본값).
    @Transactional(readOnly = true)
    public List<ConsultationResponseDto> getMyConsultations(String email, String status){
        Agency agency = findMyAgency(email);

        List<AgencyConsultation> list;

        if(status == null || status.isBlank() || "ALL".equalsIgnoreCase(status)){
            list = agencyConsultationRepository.findByAgencyIdOrderByCreatedAtDesc(agency.getId());
        } else {
            // 잘못된 값이 들어오면 valueOf 에서 예외가 나므로 미리 확인해서 안내 메시지를 준다
            ConsultationStatus filter = toConsultationStatus(status);
            list = agencyConsultationRepository.findByAgencyIdAndStatusOrderByCreatedAtDesc(agency.getId(), filter);
        }

        return list.stream().map(ConsultationResponseDto::of).toList();
    }

    // 상담 요청 1건 조회 ("답변하기" 페이지에서 쓴다)
    @Transactional(readOnly = true)
    public ConsultationResponseDto getMyConsultation(String email, Long consultationId){
        return ConsultationResponseDto.of(findMyConsultation(email, consultationId));
    }

    // 상담 요청에 답변을 저장한다.
    // 아직 답변 전('상담 요청')이었다면 답변을 보낸 시점에 '상담 확정'으로 넘어간다.
    // 이미 완료되었거나 종료된 상담에 답변을 고치는 경우에는 상태를 되돌리지 않는다.
    @Transactional
    public ConsultationResponseDto replyToConsultation(String email, Long consultationId, String reply){
        if(reply == null || reply.isBlank()){
            throw new IllegalArgumentException("답변 내용을 입력해 주세요.");
        }

        AgencyConsultation bean = findMyConsultation(email, consultationId);

        bean.setReply(reply.trim());
        bean.setRepliedAt(LocalDateTime.now());

        if(bean.getStatus() == ConsultationStatus.REQUESTED){
            bean.setStatus(ConsultationStatus.ACCEPTED);
        }
        // 영속 상태의 엔터티라서 트랜잭션이 끝나면 UPDATE 가 자동으로 실행된다

        return ConsultationResponseDto.of(bean);
    }

    // 상담 상태를 직접 바꾼다. (상담 완료 처리, 종료 처리)
    // 화면의 [상담 완료] / [종료] 버튼이 이 메소드를 쓴다.
    @Transactional
    public ConsultationResponseDto updateConsultationStatus(String email, Long consultationId, String status){
        AgencyConsultation bean = findMyConsultation(email, consultationId);

        bean.setStatus(toConsultationStatus(status));

        return ConsultationResponseDto.of(bean);
    }

    // 상담 1건을 찾아오면서 "내 사무소로 온 요청이 맞는지"까지 확인한다.
    // 조회·답변·상태변경에서 똑같이 필요한 검사라 따로 뺐다.
    private AgencyConsultation findMyConsultation(String email, Long consultationId){
        Agency agency = findMyAgency(email);

        AgencyConsultation bean = agencyConsultationRepository.findById(consultationId)
                .orElseThrow(() -> new IllegalArgumentException("해당 상담 요청을 찾을 수 없습니다."));

        // 다른 사무소로 온 요청을 id 만 바꿔서 열어 보거나 고치는 것을 막는다
        if(!bean.getAgency().getId().equals(agency.getId())){
            throw new IllegalArgumentException("내 중개사무소로 온 상담 요청이 아닙니다.");
        }

        return bean;
    }

    // 리뷰 관리 탭의 목록 (한 페이지 10개)
    // filter : ALL(전체) / UNANSWERED(미답변만) / ANSWERED(답변 완료)
    @Transactional(readOnly = true)
    public Page<AgencyReviewDto> getMyReviews(String email, String filter, int page){
        Agency agency = findMyAgency(email);
        Long agencyId = agency.getId();

        Pageable pageable = PageRequest.of(Math.max(0, page), REVIEW_PAGE_SIZE);

        Page<AgencyReview> result = switch (filter == null ? "ALL" : filter.toUpperCase()) {
            case "UNANSWERED" -> agencyReviewRepository.findByAgencyIdAndReplyIsNullOrderByIdDesc(agencyId, pageable);
            case "ANSWERED" -> agencyReviewRepository.findByAgencyIdAndReplyIsNotNullOrderByIdDesc(agencyId, pageable);
            default -> agencyReviewRepository.findByAgencyIdOrderByIdDesc(agencyId, pageable);
        };

        return result.map(AgencyReviewDto::of);
    }

    // 리뷰에 답변을 단다.
    @Transactional
    public AgencyReviewDto replyToReview(String email, Long reviewId, String reply){
        if(reply == null || reply.isBlank()){
            throw new IllegalArgumentException("답변 내용을 입력해 주세요.");
        }

        Agency agency = findMyAgency(email);

        AgencyReview bean = agencyReviewRepository.findById(reviewId)
                .orElseThrow(() -> new IllegalArgumentException("해당 리뷰를 찾을 수 없습니다."));

        if(!bean.getAgency().getId().equals(agency.getId())){
            throw new IllegalArgumentException("내 중개사무소의 리뷰가 아닙니다.");
        }

        bean.setReply(reply.trim());
        bean.setRepliedAt(LocalDateTime.now());

        return AgencyReviewDto.of(bean);
    }

    // 사무소 정보 수정 (사무소 정보 탭의 "수정" 모드에서 저장할 때)
    // 이름·주소처럼 화면에서 고칠 수 있는 값만 반영한다.
    // 인증 여부(verified)나 평점(ratingAvg)처럼 중개인이 마음대로 바꾸면 안 되는 값은 건드리지 않는다.
    @Transactional
    public AgencyDetailDto updateMyAgency(String email, AgencyDetailDto dto){
        Agency agency = findMyAgency(email);

        // 주소가 바뀌었는지 미리 확인해 둔다. 바뀌었으면 좌표를 다시 조회해야 하기 때문이다.
        String previousAddress = agency.getAddress();

        if(dto.getName() != null && !dto.getName().isBlank()) agency.setName(dto.getName().trim());
        if(dto.getBrokerName() != null && !dto.getBrokerName().isBlank()) agency.setBrokerName(dto.getBrokerName().trim());
        if(dto.getAddress() != null && !dto.getAddress().isBlank()) agency.setAddress(dto.getAddress().trim());

        // 주소를 검색해서 다시 고른 경우에만 지역 조각이 함께 온다.
        // 전화번호만 고치고 저장한 경우에는 값이 비어 오므로 기존 값을 지우지 않는다.
        if(dto.getSigungu() != null && !dto.getSigungu().isBlank()) agency.setSigungu(dto.getSigungu());
        if(dto.getDong() != null && !dto.getDong().isBlank()) agency.setDong(dto.getDong());

        agency.setPhone(dto.getPhone());
        agency.setHours(dto.getHours());
        agency.setRegistrationNo(dto.getRegistrationNo());
        agency.setLatitude(dto.getLatitude());
        agency.setLongitude(dto.getLongitude());

        // 주소로 좌표(위도·경도)를 채운다.
        // 중개인이 좌표를 직접 입력할 수는 없으므로, 주소를 저장할 때 서버가 대신 찾아 넣는다.
        updateCoordinates(agency, previousAddress);

        // 상담 가능 상태(AVAILABLE / RESERVED / CLOSED)는 중개인이 직접 바꿀 수 있는 값이다
        if(dto.getStatus() != null && !dto.getStatus().isBlank()){
            agency.setStatus(com.brentversal.agency.constant.AgencyStatus.valueOf(dto.getStatus()));
        }

        return AgencyDetailDto.of(agency);
    }

    // 주소를 좌표로 바꿔 사무소에 저장한다.
    //
    // 다시 조회하는 경우는 두 가지다.
    //   1) 주소가 바뀌었을 때  : 예전 좌표는 더 이상 맞지 않는다
    //   2) 좌표가 비어 있을 때 : 예전에 등록돼 좌표가 없는 사무소를 저장하면 이때 채워진다
    // 좌표를 못 찾으면(카카오 키가 없거나 검색 실패) 기존 값을 그대로 두고 넘어간다.
    // 지도에 안 보일 뿐, 사무소 정보 저장은 정상적으로 끝나야 하기 때문이다.
    private void updateCoordinates(Agency agency, String previousAddress){
        String address = agency.getAddress();

        boolean addressChanged = address != null && !address.equals(previousAddress);
        boolean coordinatesMissing = agency.getLatitude() == null || agency.getLongitude() == null;

        if(!addressChanged && !coordinatesMissing) return;

        kakaoGeocodingService.findCoordinates(address).ifPresent(coordinates -> {
            agency.setLatitude(coordinates.latitude());
            agency.setLongitude(coordinates.longitude());
        });
    }

    /*
      중개인 홈의 "매물 반응 추이" 와 "머신러닝 평가" 자료.

      화면정의서에는 반응 추이가 "월별 조회수"로 적혀 있지만, 매물 상세를 몇 번 열었는지는
      어디에도 남기지 않는다(조회수 컬럼도, 열람 기록 테이블도 없다). 대신 사용자가 매물에
      남긴 행동에는 시각이 함께 저장돼 있어서, 그 셋을 합쳐 "반응"으로 보여 준다.
        관심 등록(favorites) · 추천 평가(recommendation_feedback) · 상담 요청(agency_consultations)

      조회는 모두 집계 질의로 한 번씩만 부른다. 매물을 돌면서 세면 매물 수만큼 조회가 반복된다.
    */
    @Transactional(readOnly = true)
    public MyAgencyInsightsDto getInsights(String email){
        Agency agency = findMyAgency(email);
        Long agencyId = agency.getId();

        MyAgencyInsightsDto dto = new MyAgencyInsightsDto();

        LocalDateTime now = LocalDateTime.now();

        // ── 매물 반응 추이 ────────────────────────────────────
        YearMonth firstMonth = YearMonth.from(now).minusMonths(TREND_MONTHS - 1L);
        LocalDateTime from = firstMonth.atDay(1).atStartOfDay();

        Map<String, Long> favoriteByMonth = toMonthlyMap(favoriteRepository.countMonthlyByAgencyId(agencyId, from));
        Map<String, Long> feedbackByMonth = toMonthlyMap(recommendationFeedbackRepository.countMonthlyByAgencyId(agencyId, from));
        Map<String, Long> consultationByMonth = toMonthlyMap(agencyConsultationRepository.countMonthlyByAgencyId(agencyId, from));

        List<MonthlyReactionDto> trend = new ArrayList<>();
        long trendTotal = 0;

        // 자료가 없는 달도 빈칸으로 그려야 추이가 이어져 보인다. 그래서 달을 먼저 만들고 값을 채운다.
        for(int i = 0; i < TREND_MONTHS; i++){
            YearMonth month = firstMonth.plusMonths(i);
            String key = month.toString(); // "2026-08"

            MonthlyReactionDto item = MonthlyReactionDto.of(
                    key,
                    month.getMonthValue() + "월",
                    favoriteByMonth.getOrDefault(key, 0L),
                    feedbackByMonth.getOrDefault(key, 0L),
                    consultationByMonth.getOrDefault(key, 0L));

            trend.add(item);
            trendTotal += item.getTotal();
        }

        dto.setTrend(trend);
        dto.setTrendTotal(trendTotal);
        dto.setTrendMonths(TREND_MONTHS);

        // ── 머신러닝 평가 : 좋아요·싫어요 비중 ──────────────────
        long likeCount = 0;
        long dislikeCount = 0;

        for(Object[] row : recommendationFeedbackRepository.countByTypeAndAgencyId(agencyId)){
            long count = toLong(row[1]);

            // 집계 질의가 돌려주는 열거형은 보통 Enum 그대로지만, 드라이버에 따라 문자열로 올 수도 있다.
            // 여기서 잘못 갈리면 좋아요·싫어요가 조용히 뒤바뀌므로 두 경우를 모두 본다.
            boolean isLike = row[0] == RecommendationFeedbackType.LIKE
                    || RecommendationFeedbackType.LIKE.name().equals(String.valueOf(row[0]));

            if(isLike) likeCount += count;
            else dislikeCount += count;
        }

        long feedbackTotal = likeCount + dislikeCount;

        dto.setLikeCount(likeCount);
        dto.setDislikeCount(dislikeCount);
        dto.setFeedbackTotal(feedbackTotal);
        dto.setLikeRatio(feedbackTotal == 0 ? 0 : Math.round(likeCount * 1000.0 / feedbackTotal) / 10.0);

        // 매물별 관심 등록 수 (오래 남은 매물 카드에서 함께 보여 준다)
        Map<Long, Long> favoriteByProperty = new HashMap<>();

        for(Object[] row : favoriteRepository.countByPropertyAndAgencyId(agencyId)){
            favoriteByProperty.put(toLong(row[0]), toLong(row[1]));
        }

        // ── 머신러닝 평가 : 싫어요 비중이 높은 매물 ──────────────
        List<Object[]> perProperty = recommendationFeedbackRepository.countByPropertyAndAgencyId(agencyId);

        Map<Long, long[]> feedbackByProperty = new LinkedHashMap<>();

        for(Object[] row : perProperty){
            feedbackByProperty.put(toLong(row[0]), new long[]{ toLong(row[1]), toLong(row[2]) });
        }

        if(!feedbackByProperty.isEmpty()){
            // 매물을 한 건씩 찾지 않고 한 번에 모아 읽는다 (N+1 방지)
            Map<Long, Property> properties = new HashMap<>();

            for(Property property : propertyRepository.findByIdIn(new ArrayList<>(feedbackByProperty.keySet()))){
                properties.put(property.getId(), property);
            }

            List<FeedbackPropertyDto> disliked = new ArrayList<>();

            feedbackByProperty.forEach((propertyId, counts) -> {
                Property property = properties.get(propertyId);

                // 매물이 지워졌으면 보여 줄 것이 없다
                if(property == null) return;

                // 싫어요가 하나도 없는 매물은 "손봐야 할 매물" 목록에 올릴 이유가 없다
                if(counts[1] == 0) return;

                disliked.add(FeedbackPropertyDto.of(property, counts[0], counts[1]));
            });

            // 싫어요 비중이 높은 순, 같으면 싫어요 건수가 많은 순
            disliked.sort(Comparator
                    .comparingDouble(FeedbackPropertyDto::getDislikeRatio).reversed()
                    .thenComparing(Comparator.comparingLong(FeedbackPropertyDto::getDislikeCount).reversed()));

            dto.setDislikedProperties(disliked.stream().limit(INSIGHT_ITEM_LIMIT).toList());
        }

        // ── 머신러닝 평가 : 오래 남아 있는 매물 ──────────────────
        List<StalePropertyDto> stale = propertyRepository
                .findByAgencyIdAndStatusOrderByCreatedAtAsc(
                        agencyId,
                        PropertyStatus.ACTIVE,
                        PageRequest.of(0, INSIGHT_ITEM_LIMIT))
                .getContent()
                .stream()
                .map(property -> {
                    long[] counts = feedbackByProperty.getOrDefault(property.getId(), new long[]{0L, 0L});

                    return StalePropertyDto.of(
                            property,
                            now,
                            favoriteByProperty.getOrDefault(property.getId(), 0L),
                            counts[1]);
                })
                .toList();

        dto.setStaleProperties(stale);

        return dto;
    }

    // [연, 월, 건수] 집계 결과를 "2026-08" -> 건수 형태로 바꾼다.
    private Map<String, Long> toMonthlyMap(List<Object[]> rows){
        Map<String, Long> result = new HashMap<>();

        for(Object[] row : rows){
            int year = (int) toLong(row[0]);
            int month = (int) toLong(row[1]);

            result.put(YearMonth.of(year, month).toString(), toLong(row[2]));
        }

        return result;
    }

    // 집계 질의가 돌려주는 숫자는 DB 에 따라 Long·Integer·BigInteger 로 섞여 온다.
    // 형 변환에서 터지지 않도록 Number 로 받아 한 가지로 맞춘다.
    private long toLong(Object value){
        return (value instanceof Number number) ? number.longValue() : 0L;
    }

    // 문자열로 들어온 상태값을 열거형으로 바꾼다. 잘못된 값이면 안내 메시지를 준다.
    private ConsultationStatus toConsultationStatus(String status){
        try {
            return ConsultationStatus.valueOf(status.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("알 수 없는 상태값입니다 : " + status);
        }
    }
}
