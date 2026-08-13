package com.brentversal.neighborhood.dto;

import java.util.ArrayList;
import java.util.List;

public class NeighborhoodSearchRequest {

    private String city;
    private String district;
    private String dong;
    private List<Long> tagIds = new ArrayList<>();
    private NeighborhoodSort sort = NeighborhoodSort.POPULAR;
    private boolean includeHidden;

    public String getCity() {
        return city;
    }

    public void setCity(String city) {
        this.city = city;
    }

    public String getDistrict() {
        return district;
    }

    public void setDistrict(String district) {
        this.district = district;
    }

    public String getDong() {
        return dong;
    }

    public void setDong(String dong) {
        this.dong = dong;
    }

    public List<Long> getTagIds() {
        return tagIds;
    }

    public void setTagIds(List<Long> tagIds) {
        this.tagIds = tagIds == null ? new ArrayList<>() : tagIds;
    }

    public NeighborhoodSort getSort() {
        return sort;
    }

    public void setSort(NeighborhoodSort sort) {
        this.sort = sort == null ? NeighborhoodSort.POPULAR : sort;
    }

    public boolean isIncludeHidden() {
        return includeHidden;
    }

    public void setIncludeHidden(boolean includeHidden) {
        this.includeHidden = includeHidden;
    }
}
