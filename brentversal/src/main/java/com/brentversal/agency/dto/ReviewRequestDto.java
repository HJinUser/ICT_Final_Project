package com.brentversal.agency.dto;

import lombok.Getter;
import lombok.Setter;

// 클라이언트가 보낸 후기 작성 내용을 담기 위한 DTO
@Getter @Setter
public class ReviewRequestDto {
    private Integer rating ; // 별점 1~5
    private String content ; // 한줄 후기
}
