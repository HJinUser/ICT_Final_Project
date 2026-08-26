package com.brentversal.editrequest.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

// 관리자가 매물 상세의 "수정 요청" 화면에서 보내는 요청 본문
@Getter @Setter
public class PropertyEditRequestCreateDto {

    @NotBlank(message = "수정 요청 사유를 입력해 주세요.")
    @Size(max = 1000, message = "수정 요청 사유는 1000자까지 입력할 수 있습니다.")
    private String reason;
}
