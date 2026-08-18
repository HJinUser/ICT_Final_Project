package com.brentversal.neighborhood.dto;

import com.brentversal.neighborhood.entity.Neighborhood;
import com.brentversal.tag.dto.TagResponseDto;

import java.util.List;

public class NeighborhoodResponse {

    private final Long id;
    private final String city;
    private final String district;
    private final String dong;
    private final String description;
    private final String imageUrl;
    private final long averageJeonsePrice;
    private final long propertyCount;
    private final long popularityScore;
    private final boolean visible;
    private final List<TagResponseDto> tags;

    // averageJeonsePrice·popularityScore는 엔터티에 저장돼 있지 않다.
    // 매물·찜 테이블을 직접 집계한 값을 서비스가 계산해서 넘겨준다(NeighborhoodService.toResponse 참고).
    private NeighborhoodResponse(Neighborhood neighborhood, long propertyCount, long averageJeonsePrice, long popularityScore) {
        this.id = neighborhood.getId();
        this.city = neighborhood.getCity();
        this.district = neighborhood.getDistrict();
        this.dong = neighborhood.getDong();
        this.description = neighborhood.getDescription();
        this.imageUrl = neighborhood.getImageUrl();
        this.propertyCount = propertyCount;
        this.averageJeonsePrice = averageJeonsePrice;
        this.popularityScore = popularityScore;
        this.visible = neighborhood.isVisible();
        this.tags = neighborhood.getTags().stream()
                .map(TagResponseDto::of)
                .toList();
    }

    public static NeighborhoodResponse of(Neighborhood neighborhood, long propertyCount, long averageJeonsePrice, long popularityScore) {
        return new NeighborhoodResponse(neighborhood, propertyCount, averageJeonsePrice, popularityScore);
    }

    public Long getId() { return id; }
    public String getCity() { return city; }
    public String getDistrict() { return district; }
    public String getDong() { return dong; }
    public String getDescription() { return description; }
    public String getImageUrl() { return imageUrl; }
    public long getAverageJeonsePrice() { return averageJeonsePrice; }
    public long getPropertyCount() { return propertyCount; }
    public long getPopularityScore() { return popularityScore; }
    public boolean isVisible() { return visible; }
    public List<TagResponseDto> getTags() { return tags; }
}
