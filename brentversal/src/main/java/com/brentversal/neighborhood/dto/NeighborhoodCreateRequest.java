package com.brentversal.neighborhood.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

// 관리자 "동네 등록" 폼이 보내는 값.
// 관리자는 위치·소개·이미지 주소만 입력하고, 시세·인기도 같은 나머지 항목은
// NeighborhoodService가 매물·찜 데이터를 집계해서 자동으로 채운다(저장하지 않음).
@Getter
@Setter
public class NeighborhoodCreateRequest {

    @NotBlank(message = "시·도는 필수입니다.")
    @Size(max = 30, message = "시·도는 30자 이하로 입력해 주세요.")
    private String city;

    @NotBlank(message = "시·군·구는 필수입니다.")
    @Size(max = 30, message = "시·군·구는 30자 이하로 입력해 주세요.")
    private String district;

    @NotBlank(message = "읍·면·동은 필수입니다.")
    @Size(max = 30, message = "읍·면·동은 30자 이하로 입력해 주세요.")
    private String dong;

    @Size(max = 500, message = "동네 소개는 500자 이하로 입력해 주세요.")
    private String description;

    @Size(max = 500, message = "이미지 주소는 500자 이하로 입력해 주세요.")
    private String imageUrl;

    // 태그 자동 생성(머신러닝)은 아직 붙지 않아서, 있는 태그 중 관리자가 직접 고른다.
    private List<Long> tagIds = List.of();
}
