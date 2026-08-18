package com.brentversal.neighborhood.dto;

import java.util.List;
import java.util.Map;

public class NeighborhoodListResponse {

    private final List<NeighborhoodResponse> content;
    private final int totalCount;
    private final List<String> cities;
    private final Map<String, List<String>> districtsByCity;
    private final Map<String, List<String>> dongsByDistrict;

    public NeighborhoodListResponse(
            List<NeighborhoodResponse> content,
            List<String> cities,
            Map<String, List<String>> districtsByCity,
            Map<String, List<String>> dongsByDistrict
    ) {
        this.content = content;
        this.totalCount = content.size();
        this.cities = cities;
        this.districtsByCity = districtsByCity;
        this.dongsByDistrict = dongsByDistrict;
    }

    public List<NeighborhoodResponse> getContent() { return content; }
    public int getTotalCount() { return totalCount; }
    public List<String> getCities() { return cities; }
    public Map<String, List<String>> getDistrictsByCity() { return districtsByCity; }
    public Map<String, List<String>> getDongsByDistrict() { return dongsByDistrict; }
}
