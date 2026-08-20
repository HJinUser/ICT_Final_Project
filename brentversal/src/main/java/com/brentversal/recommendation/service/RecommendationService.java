package com.brentversal.recommendation.service;

import com.brentversal.common.ml.MlClient;
import com.brentversal.favorite.entity.Favorite;
import com.brentversal.favorite.repository.FavoriteRepository;
import com.brentversal.member.entity.Member;
import com.brentversal.member.service.MemberService;
import com.brentversal.neighborhood.entity.Neighborhood;
import com.brentversal.neighborhood.repository.NeighborhoodRepository;
import com.brentversal.property.constant.DealType;
import com.brentversal.property.constant.PropertyStatus;
import com.brentversal.property.dto.PropertySearchDto;
import com.brentversal.property.entity.Property;
import com.brentversal.property.repository.PropertyRepository;
import com.brentversal.recommendation.constant.RecommendationFeedbackType;
import com.brentversal.recommendation.dto.NeighborhoodRecommendationItemDto;
import com.brentversal.recommendation.dto.PreferenceRequestDto;
import com.brentversal.recommendation.dto.PreferenceResponseDto;
import com.brentversal.recommendation.dto.RecentSearchRequestDto;
import com.brentversal.recommendation.dto.RecommendationFeedbackRequestDto;
import com.brentversal.recommendation.dto.RecommendationItemDto;
import com.brentversal.recommendation.dto.RecommendationResponseDto;
import com.brentversal.recommendation.entity.RecentSearch;
import com.brentversal.recommendation.entity.RecommendationBest;
import com.brentversal.recommendation.entity.RecommendationFeedback;
import com.brentversal.recommendation.entity.UserPreference;
import com.brentversal.recommendation.repository.RecentSearchRepository;
import com.brentversal.recommendation.repository.RecommendationBestRepository;
import com.brentversal.recommendation.repository.RecommendationFeedbackRepository;
import com.brentversal.recommendation.repository.UserPreferenceRepository;
import com.brentversal.tag.entity.Tag;
import com.brentversal.tag.repository.TagRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

/*
  맞춤 추천을 계산하고, 그 재료가 되는 취향, 평가, BEST, 최근 검색을 관리하는 서비스다.

  점수는 세 덩어리로 나뉘고 합이 100 이 된다.
      직접 설정한 취향  57
      사용자 행동       33
      최근 검색         10

  점수 계산은 파이썬(FastAPI) 쪽이 한다. 이 클래스는 계산에 필요한 재료를 DB 에서 모아
  파이썬이 알아보는 모양으로 보내고, 돌아온 결과에 화면이 필요한 매물 정보를 붙여 준다.
  배점은 파이썬 app/services/recommendation_service.py 에도 같은 값으로 들어 있다.

  파이썬 서버를 부르지 못하면 아래 calculateScores 로 이 서버가 직접 계산한다.
  파이썬을 아직 띄우지 않았거나 잠깐 끊겨도 추천 화면이 비지 않게 하려는 것이다.
  그래서 응답의 modelVersion 을 보면 어느 쪽이 계산했는지 구분할 수 있다.

  거래 유형이나 예산이 맞지 않는 매물도 후보에서 빼지 않고 감점만 한다.
  조건을 조금 벗어나도 나머지가 잘 맞으면 볼 가치가 있기 때문이다.
  후보에서 아예 빼는 것은 게시 상태가 아니거나, 숨김이거나, 사용자가 싫어요를 누른 매물뿐이다.
*/
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class RecommendationService {

    private final MemberService memberService;
    private final PropertyRepository propertyRepository;
    private final FavoriteRepository favoriteRepository;
    private final TagRepository tagRepository;
    private final NeighborhoodRepository neighborhoodRepository;
    private final UserPreferenceRepository preferenceRepository;
    private final RecommendationFeedbackRepository feedbackRepository;
    private final RecommendationBestRepository bestRepository;
    private final RecentSearchRepository recentSearchRepository;
    private final MlClient mlClient;

    // 이 추천을 무엇이 계산했는지 나타내는 값이다. 사용자가 남긴 평가와 함께 저장된다.
    // 이 값은 파이썬을 부르지 못해 이 서버가 직접 계산했을 때 쓴다.
    // 파이썬이 계산했을 때는 그쪽이 준 modelVersion 을 그대로 내보낸다.
    private static final String MODEL_VERSION = "rule-v1";

    // 화면에 내보낼 추천 매물 수와 추천 동네 수다.
    private static final int ITEM_LIMIT = 3;
    private static final int NEIGHBORHOOD_LIMIT = 3;

    /*
      추천 동네 점수의 항목별 배점이다. 합이 100 이 된다.

      직접 고른 지역을 가장 크게 보고, 그다음이 최근에 찾아본 지역이다.
      관심 태그와 생활환경은 지역을 고르지 않은 사람에게도 순위를 매길 수 있게 하는 몫이다.
    */
    private static final double HOOD_W_DISTRICT = 45;
    private static final double HOOD_W_RECENT = 25;
    private static final double HOOD_W_TAG = 20;
    private static final double HOOD_W_LIFESTYLE = 10;

    // 직접 설정한 취향 57점의 항목별 배점이다.
    private static final double W_PROPERTY_TYPE = 7;
    private static final double W_AREA = 6;
    private static final double W_ROOM_COUNT = 4;
    private static final double W_NEW_BUILD = 5;
    private static final double W_STATION = 6;
    private static final double W_EDUCATION = 4;
    private static final double W_PARK = 3;
    private static final double W_HOSPITAL = 2;
    private static final double W_CONVENIENCE = 3;
    private static final double W_BUS = 2;
    private static final double W_TAG = 12;
    private static final double W_LOW_MAINTENANCE = 3;

    // 사용자 행동 33점의 항목별 배점이다.
    private static final double W_FEEDBACK = 14;
    private static final double W_FAVORITE = 6;
    private static final double W_BEST = 13;

    // 최근 검색 10점의 항목별 배점이다.
    private static final double W_RECENT_DISTRICT = 4;
    private static final double W_RECENT_DEAL_TYPE = 2;
    private static final double W_RECENT_PRICE = 2;
    private static final double W_RECENT_PROPERTY_TYPE = 2;

    /*
      아래 세 값은 감점 폭이다. 배점 100 안에 들어가는 항목이 아니라 총점에서 빼는 값이다.

      거래 유형이 다르면 사실상 다른 물건을 보는 셈이라 가장 크게 깎고,
      예산과 선호 지역은 조금 벗어나도 볼 만하므로 작게 깎는다.
      확정된 수치가 아니라 조정할 수 있게 상수로 빼 두었다.
    */
    private static final double PENALTY_DEAL_TYPE = 20;
    private static final double PENALTY_BUDGET = 10;
    private static final double PENALTY_DISTRICT = 5;

    // 신축으로 볼 기간이다. 현재 연도에서 건축 연도를 뺀 값이 이 값 이하이면 신축으로 본다.
    private static final int NEW_BUILD_YEARS = 5;

    // 낮은 관리비로 볼 기준이다. 단위는 매물 관리비와 같은 만원이다.
    private static final int LOW_MAINTENANCE_FEE = 10;

    // 걸어갈 만한 역 거리로 볼 기준이다. 단위는 매물에 저장된 값과 같은 미터다.
    private static final double WALKABLE_STATION_DISTANCE = 500.0;

    /*
      생활환경 항목을 태그 이름으로 판단하기 위한 낱말이다.

      지하철역, 학교, 공원 같은 시설까지의 실제 거리는 아직 이 서버가 가지고 있지 않다.
      그래서 매물에 붙은 태그 이름에 아래 낱말이 들어 있는지로 대신 판단한다.
      시설 거리 자료가 생기면 이 부분을 거리 비교로 바꾸면 된다.
    */
    private static final List<String> STATION_KEYWORDS = List.of("지하철", "역세권", "역 도보");
    private static final List<String> EDUCATION_KEYWORDS = List.of("학교", "학원", "교육");
    private static final List<String> PARK_KEYWORDS = List.of("공원", "산책", "녹지");
    private static final List<String> HOSPITAL_KEYWORDS = List.of("병원", "의료");
    private static final List<String> CONVENIENCE_KEYWORDS = List.of("마트", "편의점", "상권", "쇼핑");
    private static final List<String> BUS_KEYWORDS = List.of("버스");

    // 로그인한 회원을 이메일로 찾는다. 없으면 더 진행하지 않고 예외를 던진다.
    private Member findMember(String email) {
        if (email == null || email.isBlank()) {
            throw new EntityNotFoundException("로그인 정보를 확인할 수 없습니다.");
        }

        Member member = memberService.findByEmail(email);

        if (member == null) {
            throw new EntityNotFoundException("회원 정보를 찾을 수 없습니다.");
        }

        return member;
    }

    // 저장해 둔 취향을 화면의 사이드바에 다시 채워 넣기 위해 조회한다.
    // 아직 한 번도 저장하지 않은 회원이면 비어 있는 응답을 준다.
    public PreferenceResponseDto findPreference(String email) {
        Member member = findMember(email);

        UserPreference preference = preferenceRepository.findByMemberId(member.getId()).orElse(null);

        return PreferenceResponseDto.of(preference, member);
    }

    // 화면에서 고른 취향을 저장한다. 이미 저장한 취향이 있으면 새로 만들지 않고 그 위에 덮어쓴다.
    @Transactional
    public void savePreference(String email, PreferenceRequestDto dto) {
        if (dto == null) {
            throw new IllegalArgumentException("저장할 취향 정보가 없습니다.");
        }

        Member member = findMember(email);

        UserPreference preference = preferenceRepository.findByMemberId(member.getId())
                .orElseGet(UserPreference::new);

        preference.setMember(member);
        preference.setPreferredDealType(dto.getDealType());
        preference.setPreferredPropertyTypes(dto.getPropertyTypes() == null
                ? new HashSet<>()
                : new HashSet<>(dto.getPropertyTypes()));
        preference.setPreferredDistricts(dto.getPreferredDistricts() == null
                ? new HashSet<>()
                : new HashSet<>(dto.getPreferredDistricts()));

        preference.setMinArea(dto.getMinArea());
        preference.setMaxArea(dto.getMaxArea());
        preference.setMinRoomCount(dto.getMinRoomCount());

        preference.setSaleMinPrice(dto.getSaleMinPrice());
        preference.setSaleMaxPrice(dto.getSaleMaxPrice());
        preference.setJeonseMinDeposit(dto.getJeonseMinDeposit());
        preference.setJeonseMaxDeposit(dto.getJeonseMaxDeposit());
        preference.setMonthlyMinDeposit(dto.getMonthlyMinDeposit());
        preference.setMonthlyMaxDeposit(dto.getMonthlyMaxDeposit());
        preference.setMonthlyMinRent(dto.getMonthlyMinRent());
        preference.setMonthlyMaxRent(dto.getMonthlyMaxRent());

        preference.setNewBuildPreferred(dto.isNewBuildPreferred());
        preference.setStationPreferred(dto.isStationPreferred());
        preference.setEducationPreferred(dto.isEducationPreferred());
        preference.setParkPreferred(dto.isParkPreferred());
        preference.setHospitalPreferred(dto.isHospitalPreferred());
        preference.setConveniencePreferred(dto.isConveniencePreferred());
        preference.setBusPreferred(dto.isBusPreferred());
        preference.setLowMaintenancePreferred(dto.isLowMaintenancePreferred());

        preference.setUpdatedAt(LocalDateTime.now());
        preferenceRepository.save(preference);

        // 선호 태그는 취향이 아니라 회원이 직접 가진다. member_tag 의 회원 컬럼이
        // 회원 테이블을 그대로 가리키게 하려는 것이라 저장 위치도 회원 쪽이다.
        Set<Long> tagIds = dto.getTagIds() == null ? Set.of() : dto.getTagIds();
        member.setPreferredTags(new HashSet<>(tagRepository.findAllById(tagIds)));
    }

    // 추천 카드에서 누른 좋아요, 싫어요 평가를 저장한다. 같은 매물을 다시 평가하면 기존 기록을 고친다.
    @Transactional
    public void saveFeedback(String email, RecommendationFeedbackRequestDto dto) {
        if (dto == null || dto.getPropertyId() == null || dto.getType() == null) {
            throw new IllegalArgumentException("평가할 매물과 평가 종류가 필요합니다.");
        }

        Member member = findMember(email);

        Property property = propertyRepository.findById(dto.getPropertyId())
                .orElseThrow(() -> new EntityNotFoundException("해당 매물을 찾을 수 없습니다."));

        RecommendationFeedback feedback = feedbackRepository
                .findByMemberIdAndPropertyId(member.getId(), property.getId())
                .orElseGet(RecommendationFeedback::new);

        feedback.setMember(member);
        feedback.setProperty(property);
        feedback.setType(dto.getType());
        feedback.setRecommendationScore(dto.getRecommendationScore());
        feedback.setModelVersion(dto.getModelVersion());
        feedback.setUpdatedAt(LocalDateTime.now());

        feedbackRepository.save(feedback);

        // 싫어요를 누른 매물이 BEST 로 남아 있으면 앞뒤가 맞지 않으므로 함께 해제한다.
        if (dto.getType() == RecommendationFeedbackType.DISLIKE) {
            bestRepository.findById(member.getId()).ifPresent(best -> {
                if (best.getProperty().getId().equals(property.getId())) {
                    bestRepository.delete(best);
                }
            });
        }
    }

    // 사용자가 고른 매물을 BEST 로 지정한다. BEST 는 한 사람당 하나만 유지된다.
    @Transactional
    public void setBest(String email, Long propertyId) {
        if (propertyId == null) {
            throw new IllegalArgumentException("BEST 로 지정할 매물을 선택해 주세요.");
        }

        Member member = findMember(email);

        Property property = propertyRepository.findById(propertyId)
                .orElseThrow(() -> new EntityNotFoundException("해당 매물을 찾을 수 없습니다."));

        if (property.getStatus() != PropertyStatus.ACTIVE || !Boolean.TRUE.equals(property.getVisible())) {
            throw new IllegalArgumentException("지금 볼 수 있는 매물만 BEST 로 지정할 수 있습니다.");
        }

        RecommendationFeedback feedback = feedbackRepository
                .findByMemberIdAndPropertyId(member.getId(), propertyId)
                .orElse(null);

        if (feedback != null && feedback.getType() == RecommendationFeedbackType.DISLIKE) {
            throw new IllegalArgumentException("싫어요를 누른 매물은 BEST 로 지정할 수 없습니다.");
        }

        RecommendationBest best = bestRepository.findById(member.getId())
                .orElseGet(RecommendationBest::new);

        best.setMember(member);
        best.setProperty(property);
        best.setUpdatedAt(LocalDateTime.now());

        bestRepository.save(best);
    }

    // 지정해 둔 BEST 를 해제한다. 지정한 적이 없으면 아무것도 하지 않는다.
    @Transactional
    public void clearBest(String email) {
        Member member = findMember(email);

        bestRepository.findById(member.getId()).ifPresent(bestRepository::delete);
    }

    // 지도 검색에서 사용자가 실제로 건 조건을 최근 검색으로 남긴다.
    @Transactional
    public void saveRecentSearch(String email, RecentSearchRequestDto dto) {
        if (dto == null) {
            throw new IllegalArgumentException("저장할 검색 조건이 없습니다.");
        }

        Member member = findMember(email);

        RecentSearch search = new RecentSearch();
        search.setMember(member);
        search.setDistrictName(dto.getDistrictName());
        search.setDealType(dto.getDealType());
        search.setPropertyType(dto.getPropertyType());
        search.setMinPrice(dto.getMinPrice());
        search.setMaxPrice(dto.getMaxPrice());
        search.setCreatedAt(LocalDateTime.now());

        recentSearchRepository.save(search);
    }

    /*
      맞춤 추천 결과를 만들어 돌려준다.

      shownIds 는 이미 화면에 보여 준 매물 id 다. 다른 추천 보기를 눌렀을 때 같은 매물이
      다시 나오지 않게 하려고 받는다. BEST 매물은 첫 자리에 계속 두어야 하므로 여기서 빼지 않는다.

      점수는 파이썬 서버가 매긴다. 여기서는 그 계산에 필요한 재료만 모아서 보내고,
      돌아온 매물 id 에 화면이 쓸 매물 정보를 붙여서 내보낸다.

      조회만 하는 것처럼 보이지만 더 이상 볼 수 없게 된 BEST 를 자동으로 해제하기 때문에
      읽기 전용 트랜잭션으로 두지 않는다.
    */
    @Transactional
    public RecommendationResponseDto getRecommendations(String email, List<Long> shownIds) {
        Member member = findMember(email);

        UserPreference preference = preferenceRepository.findByMemberId(member.getId())
                .orElseThrow(() -> new IllegalStateException("취향 초기설정을 먼저 완료해 주세요."));

        // 추천 후보는 지금 볼 수 있는 매물만 쓴다. 한 번에 다 계산할 수 있는 양만 가져온다.
        List<Property> candidates = new ArrayList<>(
                propertyRepository.findTop200ByStatusAndVisibleTrueOrderByCreatedAtDesc(PropertyStatus.ACTIVE));

        List<RecommendationFeedback> feedbacks = feedbackRepository.findByMemberId(member.getId());

        Set<Long> likedIds = feedbacks.stream()
                .filter(feedback -> feedback.getType() == RecommendationFeedbackType.LIKE)
                .map(feedback -> feedback.getProperty().getId())
                .collect(Collectors.toSet());

        Set<Long> dislikedIds = feedbacks.stream()
                .filter(feedback -> feedback.getType() == RecommendationFeedbackType.DISLIKE)
                .map(feedback -> feedback.getProperty().getId())
                .collect(Collectors.toSet());

        List<Favorite> favorites = favoriteRepository.findByMember(member);
        Set<Long> favoriteIds = favorites.stream()
                .map(favorite -> favorite.getProperty().getId())
                .collect(Collectors.toSet());

        RecommendationBest best = resolveBest(member, candidates);
        Long bestPropertyId = best == null ? null : best.getProperty().getId();

        List<RecentSearch> recentSearches = recentSearchRepository
                .findTop10ByMemberIdOrderByCreatedAtDesc(member.getId());

        /*
          사용자가 지금까지 반응한 매물이다.

          좋아요, 싫어요, 관심, BEST 를 모두 모은다. 이 매물들은 최근 200 건 밖으로 밀려나
          후보에 없을 수 있는데, 파이썬은 이 매물들의 특징으로 취향 벡터를 만들기 때문에
          후보와 별개로 함께 보내야 한다.

          이 서버가 직접 계산할 때도 좋아요 태그와 관심 지역을 여기서 뽑아 쓴다.
          매물마다 다시 모으면 후보 수만큼 같은 계산을 반복하게 된다.
        */
        Set<Long> behaviorIds = new HashSet<>();
        behaviorIds.addAll(likedIds);
        behaviorIds.addAll(dislikedIds);
        behaviorIds.addAll(favoriteIds);

        if (bestPropertyId != null) {
            behaviorIds.add(bestPropertyId);
        }

        List<Property> behaviorProperties = behaviorIds.isEmpty()
                ? List.of()
                : propertyRepository.findByIdIn(new ArrayList<>(behaviorIds));

        // 여기까지가 추천 계산에 필요한 재료다. 이제 파이썬에게 계산을 맡긴다.
        Map<String, Object> payload = new LinkedHashMap<>();

        payload.put("preference", preferencePayload(preference, member));
        payload.put("candidates", toMlProperties(candidates));
        payload.put("behaviorProperties", toMlProperties(behaviorProperties));
        payload.put("likedPropertyIds", new ArrayList<>(likedIds));
        payload.put("dislikedPropertyIds", new ArrayList<>(dislikedIds));
        payload.put("favoritePropertyIds", new ArrayList<>(favoriteIds));
        payload.put("bestPropertyId", bestPropertyId);
        payload.put("recentSearches", recentSearches.stream().map(this::recentPayload).toList());
        payload.put("shownPropertyIds", shownIds == null ? List.of() : shownIds);

        RecommendationResponseDto mlResponse = requestMlRecommendation(payload, candidates);

        if (mlResponse != null) {
            return mlResponse;
        }

        /*
          여기부터는 파이썬 서버를 부르지 못했을 때 쓰는 예비 계산이다.

          파이썬을 아직 띄우지 않았거나 잠깐 끊겨도 추천 화면이 비어 보이지 않게 하려는 것이다.
          배점은 파이썬 쪽과 같은 값을 쓰지만, 이 서버에는 시설까지의 실제 거리 자료가 없어서
          점수가 똑같이 나오지는 않는다.
        */
        Set<String> likedTagNames = collectTagNames(behaviorProperties, likedIds);
        Set<String> favoriteDistricts = behaviorProperties.stream()
                .filter(property -> favoriteIds.contains(property.getId()))
                .map(Property::getSigungu)
                .filter(district -> district != null && !district.isBlank())
                .collect(Collectors.toSet());

        Property bestProperty = best == null ? null : best.getProperty();

        Set<Long> preferredTagIds = member.getPreferredTags() == null
                ? Set.of()
                : member.getPreferredTags().stream().map(Tag::getId).collect(Collectors.toSet());

        Set<Long> alreadyShown = shownIds == null ? Set.of() : new HashSet<>(shownIds);

        // 점수를 매기고 상위 몇 건만 남긴다.
        List<RecommendationItemDto> scored = calculateScores(
                candidates,
                preference,
                preferredTagIds,
                likedTagNames,
                favoriteDistricts,
                bestProperty,
                recentSearches,
                dislikedIds,
                alreadyShown,
                bestPropertyId);

        RecommendationResponseDto response = new RecommendationResponseDto();
        response.setModelVersion(MODEL_VERSION);
        response.setItems(scored);
        response.setNeighborhoods(recommendNeighborhoods(preference, preferredTagIds, recentSearches));

        return response;
    }

    /*
      파이썬 서버에 추천 계산을 맡기고 그 결과를 화면이 쓰는 모양으로 바꿔 돌려준다.

      맡길 수 없었으면 null 을 돌려준다. 그러면 부르는 쪽이 이 서버 계산으로 넘어간다.
      파이썬이 꺼져 있는 것은 흔한 일이라 요청을 실패로 끝내지 않고 예비 계산으로 넘긴다.
    */
    private RecommendationResponseDto requestMlRecommendation(Map<String, Object> payload,
                                                              List<Property> candidates) {
        Map<String, Object> result;

        try {
            result = mlClient.recommend(payload);
        } catch (Exception e) {
            log.warn("추천 계산 서버를 부르지 못해 이 서버 계산으로 대신한다.", e);
            return null;
        }

        if (result == null) {
            log.warn("추천 계산 서버가 빈 응답을 보내 이 서버 계산으로 대신한다.");
            return null;
        }

        RecommendationResponseDto response = new RecommendationResponseDto();

        Object modelVersion = result.get("modelVersion");
        response.setModelVersion(modelVersion == null ? MODEL_VERSION : modelVersion.toString());
        response.setItems(toItems(result.get("items"), candidates));
        response.setNeighborhoods(toNeighborhoods(result.get("neighborhoods")));

        /*
          보낼 후보가 있었는데 추천이 하나도 돌아오지 않으면 화면이 빈 채로 남는다.

          매물에 좌표가 아직 없어서 보낼 후보가 없었던 경우가 여기에 해당한다.
          그때는 좌표를 보지 않는 이 서버 계산으로 넘겨서 화면을 채운다.
        */
        if (response.getItems().isEmpty() && !candidates.isEmpty()) {
            log.warn("추천 계산 서버가 추천 매물을 하나도 돌려주지 않아 이 서버 계산으로 대신한다.");
            return null;
        }

        return response;
    }

    // 파이썬이 돌려준 추천 매물을 화면이 쓰는 카드 정보로 바꾼다.
    // 파이썬은 매물 id 와 점수만 알려 주므로, 사진과 가격은 이미 손에 있는 후보에서 채운다.
    private List<RecommendationItemDto> toItems(Object raw, List<Property> candidates) {
        List<RecommendationItemDto> items = new ArrayList<>();

        if (!(raw instanceof List<?> rawItems)) {
            return items;
        }

        Map<Long, Property> byId = new HashMap<>();

        for (Property candidate : candidates) {
            byId.put(candidate.getId(), candidate);
        }

        for (Object element : rawItems) {
            if (!(element instanceof Map<?, ?> map)) {
                continue;
            }

            Long propertyId = toLong(map.get("propertyId"));
            Property property = propertyId == null ? null : byId.get(propertyId);

            // 우리가 보내지 않은 매물이 섞여 있으면 화면에 채울 정보가 없으므로 건너뛴다.
            if (property == null) {
                log.warn("추천 결과에 후보로 보내지 않은 매물이 들어 있어 건너뛴다. propertyId={}", propertyId);
                continue;
            }

            RecommendationItemDto item = new RecommendationItemDto();

            item.setPropertyId(propertyId);
            item.setScore(roundScore(toDouble(map.get("score"))));
            item.setReasons(toStringList(map.get("reasons")));

            // 파이썬은 isUserBest, isAiBest 라는 이름으로 보낸다. 화면이 쓰는 이름은 userBest, aiBest 다.
            item.setUserBest(Boolean.TRUE.equals(map.get("isUserBest")));
            item.setAiBest(Boolean.TRUE.equals(map.get("isAiBest")));
            item.setProperty(PropertySearchDto.of(property));

            items.add(item);
        }

        return items;
    }

    /*
      파이썬이 돌려준 추천 동네를 화면이 쓰는 모양으로 바꾼다.

      파이썬은 행정동으로 계산하고 이 서버의 동네 자료는 법정동이라 코드 체계가 서로 다르다.
      그래서 이름이 같은 동네가 이 서버에도 있을 때만 상세로 갈 수 있게 id 를 붙이고,
      없으면 비워 둔다. 화면은 id 가 없으면 이동 버튼을 감춘다.
    */
    private List<NeighborhoodRecommendationItemDto> toNeighborhoods(Object raw) {
        List<NeighborhoodRecommendationItemDto> neighborhoods = new ArrayList<>();

        if (!(raw instanceof List<?> rawItems)) {
            return neighborhoods;
        }

        for (Object element : rawItems) {
            if (!(element instanceof Map<?, ?> map)) {
                continue;
            }

            String districtName = toText(map.get("districtName"));
            String adminName = toText(map.get("adminName"));

            NeighborhoodRecommendationItemDto item = new NeighborhoodRecommendationItemDto();

            item.setAdminCode(toText(map.get("adminCode")));
            item.setAdminName(adminName);
            item.setDistrictName(districtName);
            item.setScore(roundScore(toDouble(map.get("score"))));
            item.setClusterName(toText(map.get("clusterName")));
            item.setReasons(toStringList(map.get("reasons")));
            item.setNeighborhoodId(findNeighborhoodId(districtName, adminName));

            neighborhoods.add(item);
        }

        return neighborhoods;
    }

    // 구 이름과 동 이름으로 이 서버의 동네를 찾는다. 아직 등록하지 않은 동네면 없을 수 있다.
    private Long findNeighborhoodId(String district, String dong) {
        if (district == null || district.isBlank() || dong == null || dong.isBlank()) {
            return null;
        }

        return neighborhoodRepository.findByDistrictAndDong(district, dong)
                .map(Neighborhood::getId)
                .orElse(null);
    }

    // 매물 여러 건을 파이썬에 보낼 모양으로 한 번에 바꾼다.
    // 좌표나 거래 정보가 빠진 매물은 파이썬이 받지 못하므로 여기서 걸러 낸다.
    private List<Map<String, Object>> toMlProperties(List<Property> properties) {
        return properties.stream()
                .filter(this::canSendToMl)
                .map(this::propertyPayload)
                .toList();
    }

    // 파이썬이 반드시 필요로 하는 값이 이 매물에 다 있는지 확인한다.
    private boolean canSendToMl(Property property) {
        return property.getType() != null
                && property.getDealType() != null
                && property.getLatitude() != null
                && property.getLongitude() != null;
    }

    // 매물 한 건을 파이썬이 받는 모양으로 바꾼다.
    // 이름과 자리는 파이썬 app/schemas/recommendation.py 의 PropertyCandidate 와 맞춰 둔 것이다.
    private Map<String, Object> propertyPayload(Property property) {
        Map<String, Object> payload = new LinkedHashMap<>();

        payload.put("id", property.getId());
        payload.put("propertyType", property.getType().name());
        payload.put("dealType", property.getDealType().name());
        payload.put("districtName", property.getSigungu() == null ? "" : property.getSigungu());
        payload.put("area", property.getArea() == null ? 0.0 : property.getArea().doubleValue());
        payload.put("floor", property.getFloor());
        payload.put("roomCount", property.getRoomCount());
        payload.put("bathroomCount", property.getBathroomCount());
        payload.put("buildYear", property.getBuildYear());
        payload.put("maintenanceFee", property.getMaintenanceFee());
        payload.put("price", property.getPrice());
        payload.put("deposit", property.getDeposit());
        payload.put("monthlyDeposit", property.getMonthlyDeposit());
        payload.put("monthlyRent", property.getMonthlyRent());
        payload.put("latitude", property.getLatitude());
        payload.put("longitude", property.getLongitude());
        payload.put("tags", property.getTags() == null
                ? List.of()
                : property.getTags().stream()
                        .map(Tag::getName)
                        .filter(name -> name != null && !name.isBlank())
                        .toList());

        return payload;
    }

    // 저장해 둔 취향을 파이썬이 받는 모양으로 바꾼다.
    // 선호 태그는 취향이 아니라 회원이 가지고 있으므로 회원에서 꺼내 함께 담는다.
    private Map<String, Object> preferencePayload(UserPreference preference, Member member) {
        Map<String, Object> payload = new LinkedHashMap<>();

        payload.put("dealType", preference.getPreferredDealType() == null
                ? null
                : preference.getPreferredDealType().name());
        payload.put("propertyTypes", preference.getPreferredPropertyTypes() == null
                ? List.of()
                : preference.getPreferredPropertyTypes().stream().map(Enum::name).toList());
        payload.put("preferredDistricts", preference.getPreferredDistricts() == null
                ? List.of()
                : new ArrayList<>(preference.getPreferredDistricts()));

        payload.put("minArea", preference.getMinArea());
        payload.put("maxArea", preference.getMaxArea());
        payload.put("minRoomCount", preference.getMinRoomCount());

        payload.put("saleMinPrice", preference.getSaleMinPrice());
        payload.put("saleMaxPrice", preference.getSaleMaxPrice());
        payload.put("jeonseMinDeposit", preference.getJeonseMinDeposit());
        payload.put("jeonseMaxDeposit", preference.getJeonseMaxDeposit());
        payload.put("monthlyMinDeposit", preference.getMonthlyMinDeposit());
        payload.put("monthlyMaxDeposit", preference.getMonthlyMaxDeposit());
        payload.put("monthlyMinRent", preference.getMonthlyMinRent());
        payload.put("monthlyMaxRent", preference.getMonthlyMaxRent());

        payload.put("newBuildPreferred", preference.isNewBuildPreferred());
        payload.put("stationPreferred", preference.isStationPreferred());
        payload.put("educationPreferred", preference.isEducationPreferred());
        payload.put("parkPreferred", preference.isParkPreferred());
        payload.put("hospitalPreferred", preference.isHospitalPreferred());
        payload.put("conveniencePreferred", preference.isConveniencePreferred());
        payload.put("busPreferred", preference.isBusPreferred());
        payload.put("lowMaintenancePreferred", preference.isLowMaintenancePreferred());

        payload.put("preferredTags", member.getPreferredTags() == null
                ? List.of()
                : member.getPreferredTags().stream()
                        .map(Tag::getName)
                        .filter(name -> name != null && !name.isBlank())
                        .toList());

        return payload;
    }

    // 최근 검색 한 건을 파이썬이 받는 모양으로 바꾼다.
    private Map<String, Object> recentPayload(RecentSearch search) {
        Map<String, Object> payload = new LinkedHashMap<>();

        payload.put("districtName", search.getDistrictName());
        payload.put("dealType", search.getDealType() == null ? null : search.getDealType().name());
        payload.put("propertyType", search.getPropertyType() == null ? null : search.getPropertyType().name());
        payload.put("minPrice", search.getMinPrice());
        payload.put("maxPrice", search.getMaxPrice());

        return payload;
    }

    /*
      아래 네 개는 파이썬이 보낸 JSON 값을 꺼내 쓰는 자잘한 도우미다.

      JSON 으로 받은 값은 Object 로 들어오고 숫자의 종류도 정해져 있지 않다.
      값이 없거나 생김새가 달라도 화면이 깨지지 않게 여기서 한 번 걸러서 쓴다.
    */
    private Long toLong(Object value) {
        return value instanceof Number number ? number.longValue() : null;
    }

    private double toDouble(Object value) {
        return value instanceof Number number ? number.doubleValue() : 0.0;
    }

    private String toText(Object value) {
        if (!(value instanceof String text) || text.isBlank()) {
            return null;
        }

        return text;
    }

    private List<String> toStringList(Object value) {
        if (!(value instanceof List<?> list)) {
            return new ArrayList<>();
        }

        return list.stream()
                .filter(element -> element instanceof String)
                .map(Object::toString)
                .collect(Collectors.toCollection(ArrayList::new));
    }

    // 점수는 화면에 100 점 만점으로 보이므로 범위를 벗어나지 않게 다듬는다.
    private double roundScore(double score) {
        double bounded = Math.max(0, Math.min(100, score));

        return Math.round(bounded * 10) / 10.0;
    }

    /*
      후보 매물에 점수를 매겨 화면에 내보낼 순서대로 돌려준다.

      파이썬 서버를 부르지 못했을 때만 쓰는 예비 계산이다.
      돌려주는 모양은 파이썬 결과와 같으므로 화면은 어느 쪽이 계산했는지 몰라도 된다.
    */
    private List<RecommendationItemDto> calculateScores(List<Property> candidates,
                                                        UserPreference preference,
                                                        Set<Long> preferredTagIds,
                                                        Set<String> likedTagNames,
                                                        Set<String> favoriteDistricts,
                                                        Property bestProperty,
                                                        List<RecentSearch> recentSearches,
                                                        Set<Long> dislikedIds,
                                                        Set<Long> alreadyShown,
                                                        Long bestPropertyId) {

        List<RecommendationItemDto> scored = new ArrayList<>();

        for (Property property : candidates) {
            // 싫어요를 누른 매물은 후보에서 아예 뺀다.
            if (dislikedIds.contains(property.getId())) {
                continue;
            }

            // 이미 보여 준 매물도 뺀다. 다만 BEST 는 첫 자리를 지켜야 하므로 남긴다.
            boolean isBest = property.getId().equals(bestPropertyId);

            if (!isBest && alreadyShown.contains(property.getId())) {
                continue;
            }

            RecommendationItemDto item = new RecommendationItemDto();
            List<String> reasons = new ArrayList<>();

            double score = scorePreference(property, preference, preferredTagIds, reasons)
                    + scoreBehavior(property, likedTagNames, favoriteDistricts, bestProperty, reasons)
                    + scoreRecentSearch(property, recentSearches, reasons)
                    - penalty(property, preference, reasons);

            // 점수는 화면에 100 점 만점으로 보이므로 범위를 벗어나지 않게 다듬는다.
            score = Math.max(0, Math.min(100, score));

            item.setPropertyId(property.getId());
            item.setScore(Math.round(score * 10) / 10.0);
            item.setReasons(reasons);
            item.setUserBest(isBest);
            item.setProperty(PropertySearchDto.of(property));

            scored.add(item);
        }

        // 점수가 높은 순으로 세우고, 사용자가 지정한 BEST 가 있으면 그것을 맨 앞으로 끌어올린다.
        scored.sort(Comparator.comparingDouble(RecommendationItemDto::getScore).reversed());

        if (bestPropertyId != null) {
            Optional<RecommendationItemDto> userBest = scored.stream()
                    .filter(RecommendationItemDto::isUserBest)
                    .findFirst();

            userBest.ifPresent(item -> {
                scored.remove(item);
                scored.add(0, item);
            });
        }

        List<RecommendationItemDto> result = scored.size() > ITEM_LIMIT
                ? new ArrayList<>(scored.subList(0, ITEM_LIMIT))
                : scored;

        // 사용자가 BEST 를 지정하지 않았다면 점수가 가장 높은 매물이 그 자리를 대신한다.
        if (bestPropertyId == null && !result.isEmpty()) {
            result.get(0).setAiBest(true);
        }

        return result;
    }

    // 직접 설정한 취향과 얼마나 맞는지 계산한다. 만점은 57 점이다.
    private double scorePreference(Property property,
                                   UserPreference preference,
                                   Set<Long> preferredTagIds,
                                   List<String> reasons) {
        double score = 0;

        if (preference.getPreferredPropertyTypes() != null
                && property.getType() != null
                && preference.getPreferredPropertyTypes().contains(property.getType())) {
            score += W_PROPERTY_TYPE;
            reasons.add("찾고 계신 매물 유형");
        }

        if (matchesArea(property.getArea(), preference.getMinArea(), preference.getMaxArea())) {
            score += W_AREA;
            reasons.add("희망 면적에 맞음");
        }

        if (preference.getMinRoomCount() != null
                && property.getRoomCount() != null
                && property.getRoomCount() >= preference.getMinRoomCount()) {
            score += W_ROOM_COUNT;
            reasons.add("방 " + property.getRoomCount() + "개");
        }

        if (preference.isNewBuildPreferred() && isNewBuild(property)) {
            score += W_NEW_BUILD;
            reasons.add("신축 " + NEW_BUILD_YEARS + "년 이내");
        }

        if (preference.isStationPreferred() && isNearStation(property)) {
            score += W_STATION;
            reasons.add("역세권");
        }

        if (preference.isEducationPreferred() && hasTagKeyword(property, EDUCATION_KEYWORDS)) {
            score += W_EDUCATION;
            reasons.add("교육환경 좋음");
        }

        if (preference.isParkPreferred() && hasTagKeyword(property, PARK_KEYWORDS)) {
            score += W_PARK;
            reasons.add("공원 가까움");
        }

        if (preference.isHospitalPreferred() && hasTagKeyword(property, HOSPITAL_KEYWORDS)) {
            score += W_HOSPITAL;
            reasons.add("병원 가까움");
        }

        if (preference.isConveniencePreferred() && hasTagKeyword(property, CONVENIENCE_KEYWORDS)) {
            score += W_CONVENIENCE;
            reasons.add("생활편의 좋음");
        }

        if (preference.isBusPreferred() && hasTagKeyword(property, BUS_KEYWORDS)) {
            score += W_BUS;
            reasons.add("버스 편함");
        }

        /*
          고른 태그 가운데 몇 개나 이 매물에 붙어 있는지 비율로 준다.
          태그를 많이 고른 사람이 무조건 높은 점수를 받지 않도록 개수가 아니라 비율로 계산한다.

          같은 태그가 두 번 세어지지 않도록 매물의 태그를 id 기준으로 추린 뒤에 센다.
          매물과 태그를 잇는 표에 같은 짝이 여러 줄 들어가면 일치 개수가 실제보다 커지고,
          그러면 이 항목 하나가 배점(12점)을 넘겨 전체 점수를 왜곡한다.
          표에 제약을 걸어 두었지만, 자료가 잘못되어도 점수만은 배점을 넘지 않게 여기서도 막는다.
        */
        if (!preferredTagIds.isEmpty() && property.getTags() != null) {
            long matched = property.getTags().stream()
                    .map(Tag::getId)
                    .filter(java.util.Objects::nonNull)
                    .distinct()
                    .filter(preferredTagIds::contains)
                    .count();

            if (matched > 0) {
                double ratio = Math.min(1.0, (double) matched / preferredTagIds.size());

                score += W_TAG * ratio;
                reasons.add("관심 태그 " + matched + "개 일치");
            }
        }

        if (preference.isLowMaintenancePreferred()
                && property.getMaintenanceFee() != null
                && property.getMaintenanceFee() <= LOW_MAINTENANCE_FEE) {
            score += W_LOW_MAINTENANCE;
            reasons.add("관리비 낮음");
        }

        return score;
    }

    // 사용자가 남긴 행동 기록과 얼마나 닮았는지 계산한다. 만점은 33 점이다.
    private double scoreBehavior(Property property,
                                 Set<String> likedTagNames,
                                 Set<String> favoriteDistricts,
                                 Property bestProperty,
                                 List<String> reasons) {
        double score = 0;

        // 좋아요를 누른 매물들에 붙어 있던 태그와 겹치는 만큼 점수를 준다.
        // 위 취향 태그 계산과 같은 이유로 태그 이름을 추린 뒤에 센다.
        if (!likedTagNames.isEmpty() && property.getTags() != null && !property.getTags().isEmpty()) {
            List<String> tagNames = property.getTags().stream()
                    .map(Tag::getName)
                    .filter(name -> name != null && !name.isBlank())
                    .distinct()
                    .toList();

            long matched = tagNames.stream()
                    .filter(likedTagNames::contains)
                    .count();

            if (matched > 0 && !tagNames.isEmpty()) {
                score += W_FEEDBACK * Math.min(1.0, (double) matched / tagNames.size());
                reasons.add("좋아요한 집과 비슷함");
            }
        }

        if (property.getSigungu() != null && favoriteDistricts.contains(property.getSigungu())) {
            score += W_FAVORITE;
            reasons.add("관심 매물이 있는 지역");
        }

        // BEST 로 지정한 매물과 지역, 매물 유형, 거래 유형이 얼마나 겹치는지 본다.
        if (bestProperty != null && !bestProperty.getId().equals(property.getId())) {
            int matched = 0;

            if (bestProperty.getSigungu() != null
                    && bestProperty.getSigungu().equals(property.getSigungu())) {
                matched++;
            }

            if (bestProperty.getType() != null && bestProperty.getType() == property.getType()) {
                matched++;
            }

            if (bestProperty.getDealType() != null && bestProperty.getDealType() == property.getDealType()) {
                matched++;
            }

            if (matched > 0) {
                score += W_BEST * (matched / 3.0);
                reasons.add("내 BEST 와 비슷함");
            }
        }

        return score;
    }

    /*
      최근 검색 조건과 얼마나 맞는지 계산한다. 만점은 10 점이다.

      최근 검색이 여러 건이면 그 가운데 가장 잘 맞는 한 건의 점수를 쓴다.
      검색할 때마다 조건이 조금씩 달라지므로, 여러 건의 점수를 더하면
      검색을 자주 한 사람일수록 무조건 점수가 높아져 버리기 때문이다.
    */
    private double scoreRecentSearch(Property property, List<RecentSearch> searches, List<String> reasons) {
        if (searches == null || searches.isEmpty()) {
            return 0;
        }

        double best = 0;
        boolean matched = false;

        for (RecentSearch search : searches) {
            double score = 0;

            if (search.getDistrictName() != null
                    && search.getDistrictName().equals(property.getSigungu())) {
                score += W_RECENT_DISTRICT;
            }

            if (search.getDealType() != null && search.getDealType() == property.getDealType()) {
                score += W_RECENT_DEAL_TYPE;
            }

            if (search.getPropertyType() != null && search.getPropertyType() == property.getType()) {
                score += W_RECENT_PROPERTY_TYPE;
            }

            if (matchesPrice(property, search.getMinPrice(), search.getMaxPrice())) {
                score += W_RECENT_PRICE;
            }

            if (score > best) {
                best = score;
            }

            if (score > 0) {
                matched = true;
            }
        }

        if (matched) {
            reasons.add("최근 찾아본 조건과 비슷함");
        }

        return best;
    }

    // 조건에서 벗어난 정도만큼 총점에서 깎을 값을 계산한다.
    private double penalty(Property property, UserPreference preference, List<String> reasons) {
        double penalty = 0;

        if (preference.getPreferredDealType() != null
                && property.getDealType() != null
                && preference.getPreferredDealType() != property.getDealType()) {
            penalty += PENALTY_DEAL_TYPE;
        }

        if (!withinBudget(property, preference)) {
            penalty += PENALTY_BUDGET;
        }

        if (preference.getPreferredDistricts() != null
                && !preference.getPreferredDistricts().isEmpty()
                && (property.getSigungu() == null
                || !preference.getPreferredDistricts().contains(property.getSigungu()))) {
            penalty += PENALTY_DISTRICT;
        } else if (preference.getPreferredDistricts() != null
                && preference.getPreferredDistricts().contains(property.getSigungu())) {
            reasons.add("선호 지역");
        }

        return penalty;
    }

    // 매물 가격이 취향에 적어 둔 예산 안에 있는지 확인한다.
    // 거래 유형마다 보는 금액 칸이 달라서 유형별로 나누어 비교한다.
    private boolean withinBudget(Property property, UserPreference preference) {
        if (property.getDealType() == null) {
            return true;
        }

        return switch (property.getDealType()) {
            case SALE -> inRange(property.getPrice(), preference.getSaleMinPrice(), preference.getSaleMaxPrice());
            case JEONSE -> inRange(property.getDeposit(),
                    preference.getJeonseMinDeposit(), preference.getJeonseMaxDeposit());
            case MONTHLY -> inRange(property.getMonthlyDeposit(),
                    preference.getMonthlyMinDeposit(), preference.getMonthlyMaxDeposit())
                    && inRange(property.getMonthlyRent(),
                    preference.getMonthlyMinRent(), preference.getMonthlyMaxRent());
        };
    }

    // 최근 검색에 적힌 가격 범위와 매물의 대표 금액을 비교한다.
    private boolean matchesPrice(Property property, Long minPrice, Long maxPrice) {
        if (minPrice == null && maxPrice == null) {
            return false;
        }

        if (property.getDealType() == null) {
            return false;
        }

        Long price = switch (property.getDealType()) {
            case SALE -> property.getPrice();
            case JEONSE -> property.getDeposit();
            case MONTHLY -> property.getMonthlyDeposit();
        };

        return inRange(price, minPrice, maxPrice);
    }

    // 값이 최소, 최대 사이에 있는지 확인한다. 기준이 없으면 제한이 없는 것으로 본다.
    private boolean inRange(Long value, Long min, Long max) {
        if (min == null && max == null) {
            return true;
        }

        if (value == null) {
            return false;
        }

        if (min != null && value < min) {
            return false;
        }

        return max == null || value <= max;
    }

    // 전용 면적이 희망 범위 안에 있는지 확인한다.
    private boolean matchesArea(BigDecimal area, Double minArea, Double maxArea) {
        if (minArea == null && maxArea == null) {
            return false;
        }

        if (area == null) {
            return false;
        }

        double value = area.doubleValue();

        if (minArea != null && value < minArea) {
            return false;
        }

        return maxArea == null || value <= maxArea;
    }

    // 건축 연도를 기준으로 신축인지 확인한다. 연도가 없으면 판단하지 않는다.
    private boolean isNewBuild(Property property) {
        if (property.getBuildYear() == null) {
            return false;
        }

        return LocalDate.now().getYear() - property.getBuildYear() <= NEW_BUILD_YEARS;
    }

    // 역이 걸어갈 만한 거리에 있는지 확인한다.
    // 거리 값이 없는 매물은 태그에 역 관련 낱말이 있는지로 대신 판단한다.
    private boolean isNearStation(Property property) {
        if (property.getStationDistance() != null) {
            return property.getStationDistance() <= WALKABLE_STATION_DISTANCE;
        }

        return hasTagKeyword(property, STATION_KEYWORDS);
    }

    // 매물에 붙은 태그 이름에 주어진 낱말이 들어 있는지 확인한다.
    private boolean hasTagKeyword(Property property, List<String> keywords) {
        if (property.getTags() == null || property.getTags().isEmpty()) {
            return false;
        }

        for (Tag tag : property.getTags()) {
            if (tag.getName() == null) {
                continue;
            }

            for (String keyword : keywords) {
                if (tag.getName().contains(keyword)) {
                    return true;
                }
            }
        }

        return false;
    }

    // 주어진 매물 가운데 지정한 id 에 해당하는 것들의 태그 이름을 모은다.
    private Set<String> collectTagNames(List<Property> properties, Set<Long> targetIds) {
        return properties.stream()
                .filter(property -> targetIds.contains(property.getId()))
                .filter(property -> property.getTags() != null)
                .flatMap(property -> property.getTags().stream())
                .map(Tag::getName)
                .filter(name -> name != null && !name.isBlank())
                .collect(Collectors.toSet());
    }

    /*
      지정해 둔 BEST 가 아직 쓸 수 있는지 확인해서 돌려준다.

      거래가 끝났거나 숨김으로 바뀐 매물이 첫 카드에 계속 남아 있으면 안 되므로 그때는 해제한다.
      아직 볼 수 있는 매물인데 최근 목록에서 밀려났다면 후보에 다시 넣어 준다.
    */
    private RecommendationBest resolveBest(Member member, List<Property> candidates) {
        RecommendationBest best = bestRepository.findById(member.getId()).orElse(null);

        if (best == null) {
            return null;
        }

        Property property = best.getProperty();

        if (property.getStatus() != PropertyStatus.ACTIVE || !Boolean.TRUE.equals(property.getVisible())) {
            log.debug("더 이상 볼 수 없는 매물이라 BEST 를 해제한다. propertyId={}", property.getId());
            bestRepository.delete(best);
            return null;
        }

        boolean inCandidates = candidates.stream()
                .anyMatch(candidate -> candidate.getId().equals(property.getId()));

        if (!inCandidates) {
            candidates.add(property);
        }

        return best;
    }

    /*
      추천 동네를 뽑는다.

      최종적으로는 행정동 군집 분석 결과를 그대로 내보내는 자리다.
      지금은 그 결과가 없어서 지금 있는 동네 자료로 점수를 매긴다.

      보는 것은 네 가지다.
          선호 지역에 있는 동네인지
          최근 검색한 지역인지
          고른 관심 태그가 동네 태그와 겹치는지
          생활환경 취향이 동네 태그와 맞는지

      관심 태그를 함께 보는 이유가 있다.
      취향 초기 설정에서는 키워드만 고르고 지역은 고르지 않는다.
      그래서 지역과 최근 검색만 보면 방금 가입한 사람에게는 추천할 동네가 하나도 없어서
      이 영역이 늘 비어 있게 된다. 고른 키워드는 그 사람이 남긴 유일한 단서이므로 함께 본다.
    */
    private List<NeighborhoodRecommendationItemDto> recommendNeighborhoods(UserPreference preference,
                                                                          Set<Long> preferredTagIds,
                                                                          List<RecentSearch> recentSearches) {
        List<Neighborhood> neighborhoods;

        try {
            neighborhoods = neighborhoodRepository.findAllByOrderByIdAsc();
        } catch (Exception e) {
            // 동네 추천은 곁들이는 정보라, 못 불러와도 매물 추천까지 막지 않는다.
            log.error("추천 동네를 불러오지 못했습니다.", e);
            return List.of();
        }

        Set<String> recentDistricts = recentSearches.stream()
                .map(RecentSearch::getDistrictName)
                .filter(district -> district != null && !district.isBlank())
                .collect(Collectors.toSet());

        Set<String> preferredDistricts = preference.getPreferredDistricts() == null
                ? Set.of()
                : preference.getPreferredDistricts();

        List<NeighborhoodRecommendationItemDto> scored = new ArrayList<>();

        for (Neighborhood neighborhood : neighborhoods) {
            if (!neighborhood.isVisible()) {
                continue;
            }

            double score = 0;
            List<String> reasons = new ArrayList<>();

            if (preferredDistricts.contains(neighborhood.getDistrict())) {
                score += HOOD_W_DISTRICT;
                reasons.add("선호 지역");
            }

            if (recentDistricts.contains(neighborhood.getDistrict())) {
                score += HOOD_W_RECENT;
                reasons.add("최근 찾아본 지역");
            }

            // 고른 관심 태그가 이 동네에도 붙어 있는지 본다.
            // 매물 점수와 같은 이유로 개수가 아니라 비율로 계산한다.
            if (!preferredTagIds.isEmpty() && neighborhood.getTags() != null) {
                long matched = neighborhood.getTags().stream()
                        .map(Tag::getId)
                        .filter(java.util.Objects::nonNull)
                        .distinct()
                        .filter(preferredTagIds::contains)
                        .count();

                if (matched > 0) {
                    score += HOOD_W_TAG * Math.min(1.0, (double) matched / preferredTagIds.size());
                    reasons.add("관심 태그 " + matched + "개 일치");
                }
            }

            // 동네에 붙은 태그가 이 사람의 생활환경 선호와 맞는지 본다.
            if (matchesLifestyle(neighborhood, preference, reasons)) {
                score += HOOD_W_LIFESTYLE;
            }

            if (score <= 0) {
                continue;
            }

            NeighborhoodRecommendationItemDto item = new NeighborhoodRecommendationItemDto();
            item.setAdminName(neighborhood.getDong());
            item.setDistrictName(neighborhood.getDistrict());
            item.setScore(Math.min(100, score));
            item.setReasons(reasons);
            item.setNeighborhoodId(neighborhood.getId());

            scored.add(item);
        }

        scored.sort(Comparator.comparingDouble(NeighborhoodRecommendationItemDto::getScore).reversed());

        return scored.size() > NEIGHBORHOOD_LIMIT
                ? scored.subList(0, NEIGHBORHOOD_LIMIT)
                : scored;
    }

    // 동네에 붙은 태그가 이 사람이 고른 생활환경 선호와 맞는지 확인한다.
    private boolean matchesLifestyle(Neighborhood neighborhood, UserPreference preference, List<String> reasons) {
        if (neighborhood.getTags() == null || neighborhood.getTags().isEmpty()) {
            return false;
        }

        List<String> tagNames = neighborhood.getTags().stream()
                .map(Tag::getName)
                .filter(name -> name != null)
                .toList();

        boolean matched = false;

        if (preference.isStationPreferred() && containsAny(tagNames, STATION_KEYWORDS)) {
            reasons.add("역세권");
            matched = true;
        }

        if (preference.isParkPreferred() && containsAny(tagNames, PARK_KEYWORDS)) {
            reasons.add("공원 가까움");
            matched = true;
        }

        if (preference.isConveniencePreferred() && containsAny(tagNames, CONVENIENCE_KEYWORDS)) {
            reasons.add("생활편의 좋음");
            matched = true;
        }

        return matched;
    }

    // 이름 목록 가운데 주어진 낱말을 담고 있는 것이 있는지 확인한다.
    private boolean containsAny(List<String> names, List<String> keywords) {
        for (String name : names) {
            for (String keyword : keywords) {
                if (name.contains(keyword)) {
                    return true;
                }
            }
        }

        return false;
    }

    // 관리자 화면에서 쓰는 추천 적합률을 센다.
    // 적합률은 좋아요를 좋아요와 싫어요의 합으로 나눈 값이며, 평가가 없으면 계산하지 않는다.
    public Map<String, Object> adminMetrics() {
        long likeCount = feedbackRepository.countByType(RecommendationFeedbackType.LIKE);
        long dislikeCount = feedbackRepository.countByType(RecommendationFeedbackType.DISLIKE);
        long total = likeCount + dislikeCount;

        Double fitRate = total == 0 ? null : Math.round(likeCount * 1000.0 / total) / 10.0;

        return Map.of(
                "modelVersion", MODEL_VERSION,
                "likeCount", likeCount,
                "dislikeCount", dislikeCount,
                "fitRate", fitRate == null ? "" : fitRate);
    }
}
