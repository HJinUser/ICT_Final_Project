package com.brentversal.chat.dto;

// 이 클래스에서 사용할 Java/Spring/프로젝트 타입 불러옴
import lombok.Getter;
import lombok.Setter;

/*
  사용자가 지금 보고 있는 화면 정보.

  "이 매물 시세 적정해?"처럼 지시대명사로 물었을 때 무엇을 가리키는지 알기 위해 함께 받는다.
  매물 상세 화면이 아니면 propertyId 는 비어 있다.
 */
@Getter @Setter
public class ChatPageContextDto {

    // 화면 주소 (예: /property/12)
    private String path;

    // 매물 상세 화면일 때 그 매물 번호
    private Long propertyId;
}
