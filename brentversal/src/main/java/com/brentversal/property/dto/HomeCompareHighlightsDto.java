package com.brentversal.property.dto;

import lombok.Getter;
import lombok.Setter;

import java.util.List;

/*
  홈페이지 "두 집, 나란히 비교해보세요" 실데이터용 DTO.

  거래유형(매매/전세/월세)은 서로 대표 금액 필드가 달라 직접 비교할 수 없다
  (compareProperties()도 같은 이유로 같은 거래유형끼리만 비교를 허용한다).
  그래서 거래유형별로 후보군을 나누고, 각 후보군 안에서만 여러 기준(금액·시세차이·
  면적·역거리·관리비 등)으로 순위를 매겨 합산한 뒤, 합산 점수가 가장 좋은 매물과
  가장 안 좋은 매물 한 쌍을 뽑아 담는다.

  리스트 길이가 그대로 화면 상태를 알려준다:
    0건 : 이 거래유형 매물이 아예 없음 → 화면에서 블러 처리 + "비교할 매물이 부족합니다" 안내
    1건 : 순위를 매길 만큼 정보가 갖춰진(또는 존재하는) 매물이 하나뿐 → 왼쪽에만 채우고 오른쪽은 비움
    2건 : 정상 비교 (0번 = 합산 점수가 더 좋은 매물, 1번 = 더 안 좋은 매물)
*/
@Getter @Setter
public class HomeCompareHighlightsDto {
    private List<PropertyResponseDto> sale;
    private List<PropertyResponseDto> jeonse;
    private List<PropertyResponseDto> monthly;
}
