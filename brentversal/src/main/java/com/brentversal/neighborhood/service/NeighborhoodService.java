package com.brentversal.neighborhood.service;

import com.brentversal.neighborhood.dto.NeighborhoodListResponse;
import com.brentversal.neighborhood.dto.NeighborhoodResponse;
import com.brentversal.neighborhood.dto.NeighborhoodSearchRequest;
import com.brentversal.neighborhood.dto.NeighborhoodSort;
import com.brentversal.neighborhood.entity.Neighborhood;
import com.brentversal.neighborhood.repository.NeighborhoodRepository;
import com.brentversal.property.constant.PropertyStatus;
import com.brentversal.property.repository.PropertyRepository;
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
                .filter(item -> dong == null || item.getDong().equals(dong))
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
        return NeighborhoodResponse.of(neighborhood, propertyCount);
    }

    private Comparator<NeighborhoodResponse> comparator(NeighborhoodSort sort) {
        NeighborhoodSort safeSort = sort == null ? NeighborhoodSort.POPULAR : sort;
        return switch (safeSort) {
            case LISTINGS -> Comparator.comparingLong(NeighborhoodResponse::getPropertyCount).reversed()
                    .thenComparing(NeighborhoodResponse::getDong);
            case NAME -> Comparator.comparing(NeighborhoodResponse::getDong);
            case POPULAR -> Comparator.comparingInt(NeighborhoodResponse::getPopularityScore).reversed()
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
