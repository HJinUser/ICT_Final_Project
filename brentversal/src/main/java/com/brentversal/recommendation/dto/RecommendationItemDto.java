package com.brentversal.recommendation.dto;

import com.brentversal.property.dto.PropertySearchDto;
import lombok.Getter;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

// 추천 매물 한 건이다. 화면의 카드 한 장에 그대로 대응된다.
//
// propertyId, score, reasons, isUserBest, isAiBest 는 나중에 추천 계산을 파이썬으로 옮겨도
// 그쪽이 돌려주는 값과 이름이 같다. 계산 주체가 바뀌어도 이 DTO 와 화면은 그대로 쓴다.
//
// property 만 이 서버에서 채운다. 추천 계산은 매물 id 와 점수만 만들지만,
// 화면은 사진과 가격까지 필요하다. 이 값을 담지 않으면 프론트가 카드 수만큼
// 매물 상세를 따로 조회해야 해서 요청이 여러 번 오간다.
// 서버는 후보 매물을 이미 손에 들고 있으므로 여기서 함께 담아 보낸다.
@Getter
@Setter
public class RecommendationItemDto {

    private Long propertyId;

    // 추천 적합도. 확률이 아니라 0~100 으로 바꾼 적합 점수다.
    private double score;

    // 이 매물이 왜 뽑혔는지 사람이 읽을 수 있게 적은 문구다. 화면에서 배지로 늘어놓는다.
    private List<String> reasons = new ArrayList<>();

    // 사용자가 직접 별표로 지정한 BEST 인지 여부다.
    private boolean userBest;

    // 사용자가 BEST 를 지정하지 않았을 때 점수가 가장 높아 첫 카드가 된 매물인지 여부다.
    private boolean aiBest;

    private PropertySearchDto property;
}
