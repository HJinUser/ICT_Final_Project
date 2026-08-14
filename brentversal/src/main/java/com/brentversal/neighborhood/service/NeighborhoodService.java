package com.brentversal.neighborhood.service;

import com.brentversal.favorite.repository.FavoriteRepository;
import com.brentversal.neighborhood.dto.NeighborhoodCreateRequest;
import com.brentversal.neighborhood.dto.NeighborhoodListResponse;
import com.brentversal.neighborhood.dto.NeighborhoodResponse;
import com.brentversal.neighborhood.dto.NeighborhoodSearchRequest;
import com.brentversal.neighborhood.dto.NeighborhoodSort;
import com.brentversal.neighborhood.entity.Neighborhood;
import com.brentversal.neighborhood.repository.NeighborhoodRepository;
import com.brentversal.property.constant.PropertyStatus;
import com.brentversal.property.repository.PropertyRepository;
import com.brentversal.tag.service.TagService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class NeighborhoodService {

    private final NeighborhoodRepository neighborhoodRepository;
    private final PropertyRepository propertyRepository;
    private final FavoriteRepository favoriteRepository;
    private final TagService tagService;

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
        long propertyCount = propertyRepository.countByNeighborhoodIdAndStatusAndVisibleTrue(
                neighborhood.getId(),
                PropertyStatus.ACTIVE
        );

        // 전세 매물이 하나도 없으면 avg 가 null 이라 0으로 대신한다("시세 정보 없음"은 화면이 따로 표시)
        Double avgDeposit = propertyRepository.findAverageJeonseDepositByNeighborhoodId(
                neighborhood.getId(),
                PropertyStatus.ACTIVE
        );
        long averageJeonsePrice = avgDeposit == null ? 0L : Math.round(avgDeposit);

        long popularityScore = favoriteRepository.countByProperty_NeighborhoodId(neighborhood.getId());

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
}
