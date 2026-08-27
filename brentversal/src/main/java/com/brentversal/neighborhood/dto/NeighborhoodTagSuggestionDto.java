package com.brentversal.neighborhood.dto;

import java.util.List;

/*
  관리자 화면에 보여 줄 "이 동네에 이 태그를 붙일까요?" 후보 한 줄.

  파이썬이 한줄평 키워드에서 뽑은 것이고, 이 응답만으로는 태그가 붙지 않는다.
  관리자가 골라서 PATCH /neighborhoods/{id}/tags 로 보내야 실제로 붙는다.

  evidence 는 이 태그를 고른 근거 낱말이다. 관리자가 근거를 보고 판단해야 해서 함께 내려준다.
  alreadyApplied 가 true 면 이미 그 동네에 붙어 있는 태그다.
*/
public class NeighborhoodTagSuggestionDto {

    private final Long tagId;
    private final String tagName;
    private final String category;
    private final List<String> evidence;
    private final boolean alreadyApplied;

    public NeighborhoodTagSuggestionDto(Long tagId,
                                        String tagName,
                                        String category,
                                        List<String> evidence,
                                        boolean alreadyApplied) {
        this.tagId = tagId;
        this.tagName = tagName;
        this.category = category;
        this.evidence = evidence;
        this.alreadyApplied = alreadyApplied;
    }

    public Long getTagId() { return tagId; }
    public String getTagName() { return tagName; }
    public String getCategory() { return category; }
    public List<String> getEvidence() { return evidence; }
    public boolean isAlreadyApplied() { return alreadyApplied; }
}
