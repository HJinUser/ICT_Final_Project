package com.brentversal.neighborhood.dto;

import com.brentversal.tag.dto.TagResponseDto;

import java.util.List;

/*
  동네 탐색(행정동 425개 전체보기) 카드 한 장.

  adminCode/adminName/districtName/clusterId/clusterName 은 파이썬 K-Means 결과이고,
  propertyCount/averageJeonsePrice 는 Property.adminCode 로 집계한 값이다.

  neighborhoodId 이하 네 필드는 이 행정동에 대응하는 법정동을 관리자가 등록해 둔 경우에만 채워진다.
  대응하는 등록이 없으면 null(또는 빈 목록)이고, 화면은 그때 기본 안내 문구로 대신한다.

  keywords 는 한줄평 텍스트마이닝이 뽑은 낱말이다. 관리자가 등록한 동네는 425개 중 7개뿐이라
  나머지 카드에는 tags 가 비는데, 그 자리를 대신 채우는 값이다.
  확정된 태그가 아니라 분석 결과이므로 화면에서도 태그와 구분해 보여 준다.
*/
public class NeighborhoodExploreItemDto {

    private final String adminCode;
    private final String adminName;
    private final String districtName;
    private final Integer clusterId;
    private final String clusterName;

    private final long propertyCount;
    private final long averageJeonsePrice;

    private final Long neighborhoodId;
    private final String description;
    private final String imageUrl;
    private final List<TagResponseDto> tags;
    private final List<TagResponseDto> suggestedTags;
    private final List<String> keywords;

    // 사용자가 고른 태그 가운데 이 동네가 가진 개수. 많이 맞을수록 목록 앞에 온다.
    // 태그를 고르지 않았으면 0이다.
    private final int matchedTagCount;

    public NeighborhoodExploreItemDto(String adminCode,
                                      String adminName,
                                      String districtName,
                                      Integer clusterId,
                                      String clusterName,
                                      long propertyCount,
                                      long averageJeonsePrice,
                                      Long neighborhoodId,
                                      String description,
                                      String imageUrl,
                                      List<TagResponseDto> tags,
                                      List<TagResponseDto> suggestedTags,
                                      List<String> keywords,
                                      int matchedTagCount) {
        this.adminCode = adminCode;
        this.adminName = adminName;
        this.districtName = districtName;
        this.clusterId = clusterId;
        this.clusterName = clusterName;
        this.propertyCount = propertyCount;
        this.averageJeonsePrice = averageJeonsePrice;
        this.neighborhoodId = neighborhoodId;
        this.description = description;
        this.imageUrl = imageUrl;
        this.tags = tags;
        this.suggestedTags = suggestedTags;
        this.keywords = keywords;
        this.matchedTagCount = matchedTagCount;
    }

    public String getAdminCode() { return adminCode; }
    public String getAdminName() { return adminName; }
    public String getDistrictName() { return districtName; }
    public Integer getClusterId() { return clusterId; }
    public String getClusterName() { return clusterName; }
    public long getPropertyCount() { return propertyCount; }
    public long getAverageJeonsePrice() { return averageJeonsePrice; }
    public Long getNeighborhoodId() { return neighborhoodId; }
    public String getDescription() { return description; }
    public String getImageUrl() { return imageUrl; }
    public List<TagResponseDto> getTags() { return tags; }
    public List<TagResponseDto> getSuggestedTags() { return suggestedTags; }
    public List<String> getKeywords() { return keywords; }
    public int getMatchedTagCount() { return matchedTagCount; }
}
