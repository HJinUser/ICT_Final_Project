package com.brentversal.neighborhood.dto;

import java.util.List;

/*
  관리자 태그 검토 화면의 동네 한 곳.

  동네는 법정동이고 한줄평 분석은 행정동 기준이라, 매핑을 거쳐 찾은 행정동을 함께 보여 준다.
  reviewDocumentCount 가 1이면 한 사람 의견으로 뽑은 후보라는 뜻이라, 관리자가 감안해서 봐야 한다.

  currentTagIds 는 지금 이 동네에 붙어 있는 태그 전부다. 추천에 없는 태그(관리자가 직접 붙인 것)도
  들어 있다. 태그 반영은 받은 목록으로 통째로 바꾸는 방식이라, 화면이 이 값을 그대로 실어 보내지
  않으면 추천과 무관한 태그까지 지워진다.
*/
public class NeighborhoodTagReviewDto {

    private final Long neighborhoodId;
    private final String district;
    private final String dong;

    private final String adminCode;
    private final String adminName;
    private final int reviewDocumentCount;

    private final List<Long> currentTagIds;
    private final List<NeighborhoodTagSuggestionDto> suggestions;

    public NeighborhoodTagReviewDto(Long neighborhoodId,
                                    String district,
                                    String dong,
                                    String adminCode,
                                    String adminName,
                                    int reviewDocumentCount,
                                    List<Long> currentTagIds,
                                    List<NeighborhoodTagSuggestionDto> suggestions) {
        this.neighborhoodId = neighborhoodId;
        this.district = district;
        this.dong = dong;
        this.adminCode = adminCode;
        this.adminName = adminName;
        this.reviewDocumentCount = reviewDocumentCount;
        this.currentTagIds = currentTagIds;
        this.suggestions = suggestions;
    }

    public Long getNeighborhoodId() { return neighborhoodId; }
    public String getDistrict() { return district; }
    public String getDong() { return dong; }
    public String getAdminCode() { return adminCode; }
    public String getAdminName() { return adminName; }
    public int getReviewDocumentCount() { return reviewDocumentCount; }
    public List<Long> getCurrentTagIds() { return currentTagIds; }
    public List<NeighborhoodTagSuggestionDto> getSuggestions() { return suggestions; }
}
