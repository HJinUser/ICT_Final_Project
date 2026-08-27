package com.brentversal.neighborhood.dto;

import lombok.Getter;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

/*
  관리자가 검토를 마치고 이 동네에 붙일 태그를 확정해 보내는 요청.

  고른 것만 보내는 것이 아니라 "최종 상태"를 통째로 보낸다.
  추천을 받아들이는 것뿐 아니라 이미 붙어 있던 태그를 떼는 것도 같은 요청으로 처리하기 위해서다.
*/
@Getter @Setter
public class NeighborhoodTagUpdateRequest {

    private List<Long> tagIds = new ArrayList<>();
}
