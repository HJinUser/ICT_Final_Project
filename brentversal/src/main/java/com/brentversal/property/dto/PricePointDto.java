package com.brentversal.property.dto;

import lombok.Getter;
import lombok.Setter;

/*
  매물 상세 "AI 시세예측" 그래프의 막대 한 개.

  실거래가 추이일 때는 한 해(2024, 2025 …)를, 동네 시세 비교일 때는 비교 대상
  (이 매물 / AI 예상 / 반포동 평균 …)을 한 칸으로 나타낸다.
  두 경우 모두 "이름 + 금액" 한 쌍이라 그래프를 그리는 쪽에서는 같은 모양으로 다룬다.
*/
@Getter @Setter
public class PricePointDto {
    private String label ;   // "2024" 또는 "반포동 평균"
    private Long price ;     // 만원 단위

    // 이 값이 몇 건을 근거로 나온 것인지 (실거래 건수, 비교 매물 수).
    // 근거가 한 건뿐인 평균을 시세처럼 읽으면 곤란해서 화면에 함께 보여 준다.
    private Integer count ;

    // 지금 보고 있는 매물 자신을 가리키는 막대인지. 화면에서 색을 다르게 준다.
    private boolean current ;

    public static PricePointDto of(String label, Long price, Integer count, boolean current) {
        PricePointDto dto = new PricePointDto();

        dto.setLabel(label);
        dto.setPrice(price);
        dto.setCount(count);
        dto.setCurrent(current);

        return dto;
    }
}
