package com.brentversal.neighborhood.service;

import com.brentversal.common.ml.MlClient;
import com.brentversal.favorite.repository.FavoriteRepository;
import com.brentversal.neighborhood.dto.NeighborhoodCreateRequest;
import com.brentversal.neighborhood.dto.NeighborhoodExploreItemDto;
import com.brentversal.neighborhood.dto.NeighborhoodExploreResponse;
import com.brentversal.neighborhood.dto.NeighborhoodListResponse;
import com.brentversal.neighborhood.dto.NeighborhoodResponse;
import com.brentversal.neighborhood.dto.NeighborhoodSearchRequest;
import com.brentversal.neighborhood.dto.NeighborhoodSort;
import com.brentversal.neighborhood.dto.NeighborhoodTagReviewDto;
import com.brentversal.neighborhood.dto.NeighborhoodTagSuggestionDto;
import com.brentversal.neighborhood.entity.Neighborhood;
import com.brentversal.neighborhood.repository.NeighborhoodRepository;
import com.brentversal.property.constant.PropertyStatus;
import com.brentversal.property.repository.PropertyRepository;
import com.brentversal.tag.dto.TagResponseDto;
import com.brentversal.tag.entity.Tag;
import com.brentversal.tag.repository.TagRepository;
import com.brentversal.tag.service.TagService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class NeighborhoodService {

    private final NeighborhoodRepository neighborhoodRepository;
    private final PropertyRepository propertyRepository;
    private final FavoriteRepository favoriteRepository;
    private final TagService tagService;
    private final TagRepository tagRepository;
    private final MlClient mlClient;

    // 관리자 "동네 등록". 위치·소개·이미지만 직접 입력받고, 시세·인기도는 저장하지 않는다
    // (조회할 때마다 매물·찜 테이블을 집계해서 보여 준다).
    @Transactional
    public NeighborhoodResponse create(NeighborhoodCreateRequest request) {
        if (neighborhoodRepository.existsByCityAndDistrictAndDong(
                request.getCity(), request.getDistrict(), request.getDong())) {
            throw new IllegalArgumentException("이미 등록된 동네입니다.");
        }

        Neighborhood neighborhood = new Neighborhood();
        neighborhood.setCity(request.getCity());
        neighborhood.setDistrict(request.getDistrict());
        neighborhood.setDong(request.getDong());
        neighborhood.setDescription(request.getDescription());
        neighborhood.setImageUrl(request.getImageUrl());
        neighborhood.getTags().addAll(tagService.findByIds(request.getTagIds()));

        Neighborhood saved = neighborhoodRepository.save(neighborhood);
        return toResponse(saved);
    }

    public NeighborhoodListResponse search(NeighborhoodSearchRequest request, boolean admin) {
        List<Neighborhood> all = neighborhoodRepository.findAllByOrderByIdAsc();
        String city = normalize(request.getCity());
        String district = normalize(request.getDistrict());
        String dong = normalize(request.getDong());
        Set<Long> selectedTagIds = request.getTagIds().stream()
                .filter(id -> id != null && id > 0)
                .collect(Collectors.toSet());

        List<NeighborhoodResponse> content = all.stream()
                .filter(item -> item.isVisible() || (admin && request.isIncludeHidden()))
                .filter(item -> city == null || item.getCity().equals(city))
                .filter(item -> district == null || item.getDistrict().equals(district))
                // 화면에서 "당산동 전체"를 고르면 dong 으로 "당산동"이 온다.
                // 당산동1가~6가처럼 뒤에 N가가 붙은 동네까지 함께 나와야 "전체"라는 말과 맞으므로
                // 정확히 같은 이름이 아니라 앞부분이 같은 것을 모두 고른다.
                .filter(item -> dong == null || item.getDong().startsWith(dong))
                .filter(item -> selectedTagIds.isEmpty() || item.getTags().stream()
                        .map(tag -> tag.getId())
                        .collect(Collectors.toSet())
                        .containsAll(selectedTagIds))
                .map(this::toResponse)
                .sorted(comparator(request.getSort()))
                .toList();

        List<Neighborhood> optionSource = all.stream()
                .filter(item -> item.isVisible() || admin)
                .toList();
        List<String> cities = distinctSorted(optionSource.stream().map(Neighborhood::getCity).toList());
        Map<String, List<String>> districtsByCity = new LinkedHashMap<>();
        for (String cityName : cities) {
            districtsByCity.put(cityName, distinctSorted(optionSource.stream()
                    .filter(item -> item.getCity().equals(cityName))
                    .map(Neighborhood::getDistrict)
                    .toList()));
        }

        Map<String, List<String>> dongsByDistrict = new LinkedHashMap<>();
        for (Neighborhood item : optionSource) {
            String key = locationKey(item.getCity(), item.getDistrict());
            dongsByDistrict.computeIfAbsent(key, ignored -> optionSource.stream()
                    .filter(candidate -> candidate.getCity().equals(item.getCity()))
                    .filter(candidate -> candidate.getDistrict().equals(item.getDistrict()))
                    .map(Neighborhood::getDong)
                    .distinct()
                    .sorted()
                    .toList());
        }

        return new NeighborhoodListResponse(content, cities, districtsByCity, dongsByDistrict);
    }

    public NeighborhoodResponse findById(Long id, boolean admin) {
        Neighborhood neighborhood = getNeighborhood(id);
        if (!neighborhood.isVisible() && !admin) {
            throw new NeighborhoodNotFoundException(id);
        }
        return toResponse(neighborhood);
    }

    @Transactional
    public NeighborhoodResponse toggleVisibility(Long id) {
        Neighborhood neighborhood = getNeighborhood(id);
        neighborhood.toggleVisibility();
        return toResponse(neighborhood);
    }

    private Neighborhood getNeighborhood(Long id) {
        return neighborhoodRepository.findWithTagsById(id)
                .orElseThrow(() -> new NeighborhoodNotFoundException(id));
    }

    private NeighborhoodResponse toResponse(Neighborhood neighborhood) {
        long propertyCount = propertyRepository.countByNeighborhood_IdAndStatusAndVisibleTrue(
                neighborhood.getId(),
                PropertyStatus.ACTIVE
        );

        // 전세 매물이 하나도 없으면 avg 가 null 이라 0으로 대신한다("시세 정보 없음"은 화면이 따로 표시)
        Double avgDeposit = propertyRepository.findAverageJeonseDepositByNeighborhoodId(
                neighborhood.getId(),
                PropertyStatus.ACTIVE
        );
        long averageJeonsePrice = avgDeposit == null ? 0L : Math.round(avgDeposit);

        long popularityScore = favoriteRepository.countByProperty_Neighborhood_Id(neighborhood.getId());

        return NeighborhoodResponse.of(neighborhood, propertyCount, averageJeonsePrice, popularityScore);
    }

    private Comparator<NeighborhoodResponse> comparator(NeighborhoodSort sort) {
        NeighborhoodSort safeSort = sort == null ? NeighborhoodSort.POPULAR : sort;
        return switch (safeSort) {
            case LISTINGS -> Comparator.comparingLong(NeighborhoodResponse::getPropertyCount).reversed()
                    .thenComparing(NeighborhoodResponse::getDong);
            case NAME -> Comparator.comparing(NeighborhoodResponse::getDong);
            case POPULAR -> Comparator.comparingLong(NeighborhoodResponse::getPopularityScore).reversed()
                    .thenComparing(NeighborhoodResponse::getDong);
        };
    }

    private String normalize(String value) {
        if (value == null || value.isBlank()) return null;
        return value.trim();
    }

    private List<String> distinctSorted(List<String> values) {
        return values.stream().distinct().sorted().toList();
    }

    private String locationKey(String city, String district) {
        return city + "|" + district;
    }

    /*
      동네 탐색을 서울 전체 행정동(425개) 기준으로 보여준다.

      법정동 기준으로 관리자가 등록해 둔 동네(city/district/dong)는 6개뿐이라 그 목록만으로는
      "유형별로 탐색한다"는 말이 무색하다. 그래서 파이썬 K-Means 결과(행정동 전체)를 기본 목록으로
      쓰고, 관리자가 등록한 법정동과 대응되는 행정동에는 그 설명·사진·태그를 함께 붙여 보여준다.

      clusterName/district/tagNames 는 화면의 탭·드롭다운·칩이 보내는 필터이며 모두 없으면 전체를 보여준다.

      태그 필터는 관리자가 붙인 태그와 한줄평 분석이 제안한 태그를 함께 본다.
      확정 태그는 등록된 동네 7곳에만 있어서, 그것만 보면 필터가 사실상 동작하지 않는다.
      여러 태그를 고르면 "모두 가진 동네"가 아니라 "하나라도 가진 동네"를 보여주고,
      고른 태그와 많이 맞는 동네부터 앞에 세운다.
      자료가 얇아 모두 가진 동네를 찾으면 거의 항상 0곳이 되기 때문이다.
    */
    public NeighborhoodExploreResponse explore(String clusterName, String district, List<String> tagNames) {
        List<Map<String, Object>> mlNeighborhoods;

        try {
            mlNeighborhoods = mlClient.neighborhoodList();
        } catch (Exception e) {
            // 추천 동네와 같은 이유로, 파이썬을 못 부르면 빈 화면 대신 빈 목록으로 응답한다.
            log.error("행정동 전체 목록을 불러오지 못했습니다.", e);
            return new NeighborhoodExploreResponse(List.of(), List.of(), List.of(), Map.of());
        }

        Map<String, List<String>> tagGroups = clusterTagGroups();

        // 배분표에 있는 태그만 화면에 쓴다. 엘리베이터·풀옵션처럼 집 한 채의 속성인 태그는
        // 동네를 고르는 기준이 될 수 없어 목록에서도 카드에서도 뺀다.
        Set<String> allowedTagNames = tagGroups.values().stream()
                .flatMap(List::stream)
                .collect(Collectors.toSet());

        Map<String, long[]> propertyAggByAdminCode = propertyAggregateByAdminCode();
        Map<String, Neighborhood> curatedByAdminCode = curatedNeighborhoodByAdminCode();

        // 태그 이름 -> 태그. 파이썬은 이름만 알고 id·분류는 이 서버에만 있어서 여기서 맞춘다.
        Map<String, Tag> tagByName = new LinkedHashMap<>();
        for (Tag tag : tagRepository.findAll()) {
            tagByName.put(tag.getName(), tag);
        }

        String normalizedCluster = normalize(clusterName);
        String normalizedDistrict = normalize(district);
        Set<String> selectedTagNames = tagNames == null ? Set.of() : tagNames.stream()
                .map(this::normalize)
                .filter(name -> name != null)
                .collect(Collectors.toSet());

        List<NeighborhoodExploreItemDto> allItems = new ArrayList<>();

        for (Map<String, Object> row : mlNeighborhoods) {
            String adminCode = String.valueOf(row.get("adminCode"));

            long[] aggregate = propertyAggByAdminCode.getOrDefault(adminCode, new long[]{0L, 0L});
            Neighborhood curated = curatedByAdminCode.get(adminCode);

            List<TagResponseDto> appliedTags = curated == null
                    ? List.of()
                    : curated.getTags().stream()
                            .filter(tag -> allowedTagNames.contains(tag.getName()))
                            .map(TagResponseDto::of)
                            .toList();

            // 파이썬 매핑표에만 있고 tags 테이블에 없는 이름은 걸러낸다.
            // 여기서 로그를 남기면 425번 반복되므로, 경고는 관리자 검토 목록(tagSuggestions)에서만 남긴다.
            List<TagResponseDto> suggestedTags = toStringList(row.get("suggestedTagNames")).stream()
                    .filter(allowedTagNames::contains)
                    .map(tagByName::get)
                    .filter(tag -> tag != null)
                    .map(TagResponseDto::of)
                    .toList();

            // 고른 태그 가운데 이 동네가 몇 개나 가졌는지. 확정/추천을 합쳐 세되 같은 태그는 한 번만 센다.
            Set<String> ownedTagNames = new java.util.HashSet<>();
            appliedTags.forEach(tag -> ownedTagNames.add(tag.getName()));
            suggestedTags.forEach(tag -> ownedTagNames.add(tag.getName()));

            int matchedTagCount = (int) selectedTagNames.stream()
                    .filter(ownedTagNames::contains)
                    .count();

            NeighborhoodExploreItemDto item = new NeighborhoodExploreItemDto(
                    adminCode,
                    String.valueOf(row.get("adminName")),
                    String.valueOf(row.get("districtName")),
                    toInteger(row.get("clusterId")),
                    String.valueOf(row.get("clusterName")),
                    aggregate[0],
                    aggregate[1],
                    curated == null ? null : curated.getId(),
                    curated == null ? null : curated.getDescription(),
                    curated == null ? null : curated.getImageUrl(),
                    appliedTags,
                    suggestedTags,
                    toStringList(row.get("keywords")),
                    matchedTagCount
            );

            allItems.add(item);
        }

        List<String> clusterNames = distinctSorted(allItems.stream()
                .map(NeighborhoodExploreItemDto::getClusterName)
                .toList());
        List<String> districts = distinctSorted(allItems.stream()
                .map(NeighborhoodExploreItemDto::getDistrictName)
                .toList());

        /*
          정렬 기준.

          태그를 골랐으면 많이 맞는 동네부터 세운다. 여러 태그를 고를 때 "하나만 맞는 동네"와
          "다 맞는 동네"가 섞여 나오면 고른 의미가 없기 때문이다.
          같은 개수끼리는 기존 기준(매물 많은 순 -> 이름순)을 그대로 쓴다.
        */
        Comparator<NeighborhoodExploreItemDto> order =
                Comparator.comparingInt(NeighborhoodExploreItemDto::getMatchedTagCount).reversed()
                        .thenComparing(Comparator.comparingLong(NeighborhoodExploreItemDto::getPropertyCount).reversed())
                        .thenComparing(NeighborhoodExploreItemDto::getAdminName);

        List<NeighborhoodExploreItemDto> content = allItems.stream()
                .filter(item -> normalizedCluster == null || normalizedCluster.equals(item.getClusterName()))
                .filter(item -> normalizedDistrict == null || normalizedDistrict.equals(item.getDistrictName()))
                // 고른 태그를 하나도 안 가진 동네만 뺀다(하나라도 맞으면 남긴다).
                .filter(item -> selectedTagNames.isEmpty() || item.getMatchedTagCount() > 0)
                .sorted(order)
                .toList();

        return new NeighborhoodExploreResponse(content, clusterNames, districts, tagGroups);
    }

    /*
      동네 유형별 태그 배분표를 파이썬에서 받아 온다.

      못 받으면 빈 표를 돌려준다. 그러면 태그 필터만 사라지고 목록 자체는 그대로 보인다.
      태그 하나 때문에 동네 탐색 전체가 막히면 안 되기 때문이다.
    */
    private Map<String, List<String>> clusterTagGroups() {
        Map<String, Object> payload;

        try {
            payload = mlClient.clusterTagGroups();
        } catch (Exception e) {
            log.error("동네 유형별 태그 배분표를 불러오지 못했습니다.", e);
            return Map.of();
        }

        if (payload == null || !(payload.get("groups") instanceof Map<?, ?> rawGroups)) {
            log.warn("태그 배분표 응답에 groups 가 없습니다.");
            return Map.of();
        }

        /*
          군집 이름이 바뀌었는데 파이썬 배분표를 안 고치면 그 유형의 칩이 통째로 사라진다.
          조용히 비면 원인을 찾기 어려우므로 여기서 로그로 드러낸다.
        */
        List<String> missing = toStringList(payload.get("missingClusterNames"));
        if (!missing.isEmpty()) {
            log.warn("태그 배분표에 빠진 동네 유형이 있습니다(그 유형은 태그 칩이 비어 보입니다): {}", missing);
        }

        Map<String, List<String>> groups = new LinkedHashMap<>();

        for (Map.Entry<?, ?> entry : rawGroups.entrySet()) {
            groups.put(String.valueOf(entry.getKey()), toStringList(entry.getValue()));
        }

        return groups;
    }

    // 행정동(admin_code)별 공개·게시중 매물 건수와 평균 전세가를 한 번의 질의로 모아 Map으로 만든다.
    // 값은 [건수, 평균 전세가] 순서의 long[] 이다.
    private Map<String, long[]> propertyAggregateByAdminCode() {
        Map<String, long[]> result = new LinkedHashMap<>();

        for (Object[] row : propertyRepository.countAndAverageJeonseByAdminCode(PropertyStatus.ACTIVE)) {
            String adminCode = (String) row[0];
            long count = ((Number) row[1]).longValue();
            long averageJeonsePrice = row[2] == null ? 0L : Math.round((Double) row[2]);

            result.put(adminCode, new long[]{count, averageJeonsePrice});
        }

        return result;
    }

    /*
      관리자가 등록한 법정동 동네를, 그 동네가 속한 행정동 코드를 key로 하는 Map으로 바꾼다.

      등록된 동네 수(현재 6개)만큼만 파이썬을 부르므로 425개 행정동 쪽과는 별개로 가볍다.
      매핑이 없거나(법정동-행정동 매핑표에 없음) 파이썬을 못 부르면 그 동네는 건너뛴다 —
      이 정보는 있으면 보여주는 부가 정보라, 실패했다고 전체 탐색을 막을 이유가 없다.
    */
    private Map<String, Neighborhood> curatedNeighborhoodByAdminCode() {
        Map<String, Neighborhood> result = new LinkedHashMap<>();

        List<Neighborhood> curated = neighborhoodRepository.findAllByOrderByIdAsc().stream()
                .filter(Neighborhood::isVisible)
                .toList();

        for (Neighborhood neighborhood : curated) {
            try {
                Map<String, Object> analysis = mlClient.neighborhoodByLegal(
                        neighborhood.getDistrict(), neighborhood.getDong());

                if (analysis != null && analysis.get("adminCode") != null) {
                    result.put(String.valueOf(analysis.get("adminCode")), neighborhood);
                }
            } catch (Exception e) {
                log.warn("법정동 '{} {}'의 행정동 매핑을 불러오지 못했습니다.",
                        neighborhood.getDistrict(), neighborhood.getDong(), e);
            }
        }

        return result;
    }

    private Integer toInteger(Object value) {
        return value instanceof Number number ? number.intValue() : null;
    }

    /*
      관리자 태그 검토 목록을 만든다.

      파이썬이 한줄평 키워드에서 뽑아 둔 태그 후보를, 관리자가 등록한 동네에 맞춰 보여 준다.
      여기서 태그가 붙지는 않는다. 관리자가 화면에서 고른 뒤 replaceTags 로 확정해야 붙는다.

      동네는 법정동이고 분석은 행정동 기준이라 매핑을 거친다. 등록된 동네 수만큼만 매핑을
      물어보므로(현재 6곳) 부담이 크지 않다.

      후보가 하나도 없는 동네는 관리자가 볼 것이 없으므로 목록에서 뺀다.
    */
    public List<NeighborhoodTagReviewDto> tagSuggestions() {
        Map<String, Object> payload;

        try {
            payload = mlClient.neighborhoodTagSuggestions();
        } catch (Exception e) {
            // 분석 서버가 꺼져 있어도 관리자 화면이 오류로 끝나지 않게 빈 목록으로 넘긴다.
            log.error("동네 태그 추천을 불러오지 못했습니다.", e);
            return List.of();
        }

        if (payload == null || !(payload.get("neighborhoods") instanceof Map<?, ?> byAdminCode)) {
            log.warn("동네 태그 추천 응답에 neighborhoods 가 없습니다.");
            return List.of();
        }

        // 태그 이름 -> 태그. 파이썬은 이름만 알고 id 는 이 서버에만 있어서 여기서 맞춘다.
        Map<String, Tag> tagByName = new LinkedHashMap<>();
        for (Tag tag : tagRepository.findAll()) {
            tagByName.put(tag.getName(), tag);
        }

        List<NeighborhoodTagReviewDto> result = new ArrayList<>();

        for (Neighborhood neighborhood : neighborhoodRepository.findAllByOrderByIdAsc()) {
            Map<String, Object> analysis;

            try {
                analysis = mlClient.neighborhoodByLegal(neighborhood.getDistrict(), neighborhood.getDong());
            } catch (Exception e) {
                log.warn("법정동 '{} {}'의 행정동 매핑을 불러오지 못했습니다.",
                        neighborhood.getDistrict(), neighborhood.getDong(), e);
                continue;
            }

            // 행정동 매핑이 없는 동네는 붙일 근거 자체가 없다.
            if (analysis == null || analysis.get("adminCode") == null) {
                continue;
            }

            String adminCode = String.valueOf(analysis.get("adminCode"));

            if (!(byAdminCode.get(adminCode) instanceof Map<?, ?> entry)) {
                continue;
            }

            Set<Long> appliedTagIds = neighborhood.getTags().stream()
                    .map(Tag::getId)
                    .collect(Collectors.toSet());

            List<NeighborhoodTagSuggestionDto> suggestions = new ArrayList<>();

            if (entry.get("suggestions") instanceof List<?> rawSuggestions) {
                for (Object element : rawSuggestions) {
                    if (!(element instanceof Map<?, ?> row)) {
                        continue;
                    }

                    String tagName = String.valueOf(row.get("tagName"));
                    Tag tag = tagByName.get(tagName);

                    // 파이썬 매핑표에만 있고 tags 테이블에는 없는 이름이다.
                    // 태그 이름을 바꾸면 여기서 조용히 사라지므로 로그를 남긴다.
                    if (tag == null) {
                        log.warn("태그 추천에 등록되지 않은 태그 이름이 있습니다: {}", tagName);
                        continue;
                    }

                    suggestions.add(new NeighborhoodTagSuggestionDto(
                            tag.getId(),
                            tag.getName(),
                            tag.getCategory() == null ? null : tag.getCategory().name(),
                            toStringList(row.get("evidence")),
                            appliedTagIds.contains(tag.getId())
                    ));
                }
            }

            if (suggestions.isEmpty()) {
                continue;
            }

            result.add(new NeighborhoodTagReviewDto(
                    neighborhood.getId(),
                    neighborhood.getDistrict(),
                    neighborhood.getDong(),
                    adminCode,
                    String.valueOf(analysis.get("adminName")),
                    entry.get("documentCount") instanceof Number number ? number.intValue() : 0,
                    new ArrayList<>(appliedTagIds),
                    suggestions
            ));
        }

        return result;
    }

    /*
      관리자가 확정한 태그로 이 동네의 태그를 통째로 바꾼다.

      고른 것만 더하는 것이 아니라 받은 목록을 최종 상태로 삼는다.
      추천을 받아들이는 것과 이미 붙어 있던 태그를 떼는 것을 한 번에 처리하기 위해서다.
    */
    @Transactional
    public NeighborhoodResponse replaceTags(Long id, List<Long> tagIds) {
        Neighborhood neighborhood = getNeighborhood(id);

        List<Long> safeTagIds = tagIds == null ? List.of() : tagIds.stream()
                .filter(tagId -> tagId != null && tagId > 0)
                .distinct()
                .toList();

        List<Tag> tags = tagService.findByIds(safeTagIds);

        // 없는 태그 id 가 섞여 오면 조용히 무시하지 않고 잘못된 요청으로 돌려준다.
        if (tags.size() != safeTagIds.size()) {
            throw new IllegalArgumentException("존재하지 않는 태그가 포함되어 있습니다.");
        }

        neighborhood.getTags().clear();
        neighborhood.getTags().addAll(tags);

        return toResponse(neighborhood);
    }

    // 파이썬이 보낸 JSON 배열에서 문자열만 골라 꺼낸다.
    private List<String> toStringList(Object value) {
        if (!(value instanceof List<?> list)) {
            return List.of();
        }

        return list.stream()
                .filter(element -> element instanceof String)
                .map(Object::toString)
                .toList();
    }
}
