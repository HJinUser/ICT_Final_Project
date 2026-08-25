package com.brentversal.inquiry.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class InquiryCreateRequestDto {

    @NotNull(message = "문의할 매물을 확인할 수 없습니다.")
    @Positive(message = "매물 번호는 1 이상이어야 합니다.")
    private Long propertyId;

    @NotBlank(message = "문의 제목은 필수 입력 사항입니다.")
    @Size(max = 200, message = "문의 제목은 200자 이하로 입력해 주세요.")
    private String title;

    @NotBlank(message = "문의 내용은 필수 입력 사항입니다.")
    private String content;
}
