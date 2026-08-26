package com.brentversal.property.dto;

import lombok.Getter;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

/*
  매물 상세 "AI 시세예측" 그래프에 넣을 자료.

  근거로 쓸 자료가 매물마다 달라서 무엇을 보여 줬는지(source)를 함께 내려 준다.

    TRANSACTION  : 국토부 아파트 매매 실거래가의 연도별 평균 (원래 목표한 시세 추이)
    NEIGHBORHOOD : 같은 동네·같은 조건 매물과의 시세 비교 (실거래가가 없을 때)
    NONE         : 둘 다 만들 수 없음 (화면은 빈 상자 대신 안내 문구를 보여 준다)

  실거래가는 국토부가 '아파트 매매'만 제공하므로 전세·월세나 아파트가 아닌 매물은
  TRANSACTION 이 될 수 없다. 그래서 대체 근거를 함께 두었다.
*/
@Getter @Setter
public class PropertyPriceTrendDto {

    public static final String SOURCE_TRANSACTION = "TRANSACTION" ;
    public static final String SOURCE_NEIGHBORHOOD = "NEIGHBORHOOD" ;
    public static final String SOURCE_NONE = "NONE" ;

    private String source ;      // 위 세 가지 중 하나
    private String title ;       // "실거래가 추이" / "동네 시세 비교"
    private String description ; // 무엇을 근거로 만든 값인지 한 줄 설명

    private List<PricePointDto> points = new ArrayList<>();

    // 그래프 위에 기준선으로 긋는 값들 (만원). 예측 전이면 aiPrice 가 null 이다.
    private Long aiPrice ;
    private Long currentPrice ;

    public static PropertyPriceTrendDto none(String description) {
        PropertyPriceTrendDto dto = new PropertyPriceTrendDto();

        dto.setSource(SOURCE_NONE);
        dto.setTitle("시세 비교 자료 없음");
        dto.setDescription(description);

        return dto;
    }
}
