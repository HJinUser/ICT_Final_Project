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
    private final Double satisfactionAvg;
    private final Long averageJeonsePrice;
    private final long propertyCount;
    private final Integer popularityScore;
    private final boolean visible;
    private final List<TagResponseDto> tags;

    private NeighborhoodResponse(Neighborhood neighborhood, long propertyCount) {
        this.id = neighborhood.getId();
        this.city = neighborhood.getCity();
        this.district = neighborhood.getDistrict();
        this.dong = neighborhood.getDong();
        this.description = neighborhood.getDescription();
        this.imageUrl = neighborhood.getImageUrl();
        this.satisfactionAvg = neighborhood.getSatisfactionAvg();
        this.averageJeonsePrice = neighborhood.getAverageJeonsePrice();
        this.propertyCount = propertyCount;
        this.popularityScore = neighborhood.getPopularityScore();
        this.visible = neighborhood.isVisible();
        this.tags = neighborhood.getTags().stream()
                .map(TagResponseDto::of)
                .toList();
    }

    public static NeighborhoodResponse of(Neighborhood neighborhood, long propertyCount) {
        return new NeighborhoodResponse(neighborhood, propertyCount);
    }

    public Long getId() { return id; }
    public String getCity() { return city; }
    public String getDistrict() { return district; }
    public String getDong() { return dong; }
    public String getDescription() { return description; }
    public String getImageUrl() { return imageUrl; }
    public Double getSatisfactionAvg() { return satisfactionAvg; }
    public Long getAverageJeonsePrice() { return averageJeonsePrice; }
    public long getPropertyCount() { return propertyCount; }
    public Integer getPopularityScore() { return popularityScore; }
    public boolean isVisible() { return visible; }
    public List<TagResponseDto> getTags() { return tags; }
}
