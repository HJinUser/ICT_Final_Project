package com.brentversal.propertyreview.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

// 매물 한줄평을 쓸 때 화면이 보내는 값.
// 대상 매물은 주소(/property/{id}/reviews)로 정해지므로 여기 담지 않는다.
@Getter @Setter
public class PropertyReviewRequestDto {

    @NotNull(message = "별점은 필수 입력 사항입니다.")
    @Min(value = 1, message = "별점은 1점 이상이어야 합니다.")
    @Max(value = 5, message = "별점은 5점을 초과할 수 없습니다.")
    private Integer rating;

    @NotBlank(message = "한줄평 내용은 필수 입력 사항입니다.")
    @Size(max = 500, message = "한줄평은 500자 이하로 입력해 주세요.")
    private String content;
}
