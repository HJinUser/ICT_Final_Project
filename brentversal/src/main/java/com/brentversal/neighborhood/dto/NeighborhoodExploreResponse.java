package com.brentversal.neighborhood.dto;

import java.util.List;

import java.util.Map;

/*
  동네 탐색(행정동 전체보기) 목록 응답.

  content 와 함께 화면이 탭·드롭다운·칩을 그릴 필터 후보를 담는다.
  필터 후보는 지금 고른 조건과 무관하게 전체 425개 기준으로 만든다.
  고른 조건에 맞춰 후보까지 줄어들면, 한 번 고른 뒤 다른 값으로 바꿀 수 없기 때문이다.

  tagGroups 는 동네 유형별 태그 묶음이다(유형 이름 -> 태그 이름 목록).
  파이썬이 군집을 정의하는 생활지표를 기준으로 배분해 둔 것이고, 여기에 없는 태그
  (엘리베이터·풀옵션처럼 집 한 채의 속성인 것)는 동네를 고르는 기준이 아니라 내보내지 않는다.
*/
public class NeighborhoodExploreResponse {

    private final List<NeighborhoodExploreItemDto> content;
    private final List<String> clusterNames;
    private final List<String> districts;
    private final Map<String, List<String>> tagGroups;

    public NeighborhoodExploreResponse(List<NeighborhoodExploreItemDto> content,
                                       List<String> clusterNames,
                                       List<String> districts,
                                       Map<String, List<String>> tagGroups) {
        this.content = content;
        this.clusterNames = clusterNames;
        this.districts = districts;
        this.tagGroups = tagGroups;
    }

    public List<NeighborhoodExploreItemDto> getContent() { return content; }
    public List<String> getClusterNames() { return clusterNames; }
    public List<String> getDistricts() { return districts; }
    public Map<String, List<String>> getTagGroups() { return tagGroups; }
}
