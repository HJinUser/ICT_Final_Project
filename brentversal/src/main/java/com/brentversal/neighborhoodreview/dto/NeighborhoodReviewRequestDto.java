package com.brentversal.neighborhoodreview.dto;

// 이 클래스에서 사용할 Java/Spring/프로젝트 타입 불러옴
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

// 행정동 코드·이름·자치구·한줄평 내용을 받아 저장할 때 사용하는 요청 DTO임
@Getter
@Setter
public class NeighborhoodReviewRequestDto {

    @NotBlank
    private String adminCode;

    @NotBlank
    private String adminName;

    @NotBlank
    private String districtName;

    @NotBlank
    @Size(max = 300)
    private String content;
}