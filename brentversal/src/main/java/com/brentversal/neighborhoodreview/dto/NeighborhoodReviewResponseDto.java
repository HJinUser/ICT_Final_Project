package com.brentversal.neighborhoodreview.dto;

// 이 클래스에서 사용할 Java/Spring/프로젝트 타입 불러옴
import com.brentversal.neighborhoodreview.entity.NeighborhoodReview;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

// 한줄평 ID·작성자·행정동 정보·내용·수정시각을 프론트에 내려주는 응답 DTO임
@Getter
@Setter
public class NeighborhoodReviewResponseDto {
    private Long id;
    private String memberName;
    private String adminCode;
    private String adminName;
    private String districtName;
    private String content;
    private LocalDateTime updatedAt;

    // NeighborhoodReview Entity와 작성자 정보를 한줄평 응답 DTO로 변환하는 정적 메서드임
    public static NeighborhoodReviewResponseDto of(NeighborhoodReview review) {
        NeighborhoodReviewResponseDto dto = new NeighborhoodReviewResponseDto();
        dto.setId(review.getId());
        dto.setMemberName(mask(review.getMember() == null ? null : review.getMember().getName()));
        dto.setAdminCode(review.getAdminCode());
        dto.setAdminName(review.getAdminName());
        dto.setDistrictName(review.getDistrictName());
        dto.setContent(review.getContent());
        dto.setUpdatedAt(review.getUpdatedAt());
        // 처리 완료된 결과를 호출한 쪽으로 반환함
        return dto;
    }

    // 한줄평은 누구나 볼 수 있는 정보라서 작성자 이름을 그대로 노출하지 않고 가운데를 가린다.
    // 매물 한줄평(PropertyReviewDto), 중개사무소 후기(AgencyReviewDto)와 같은 규칙이다.
    // 예) 권혜진 -> 권*진, 김철 -> 김*
    private static String mask(String name) {
        if (name == null || name.isBlank()) return "탈퇴한 회원";
        if (name.length() == 1) return name;
        if (name.length() == 2) return name.charAt(0) + "*";

        return name.charAt(0) + "*".repeat(name.length() - 2) + name.charAt(name.length() - 1);
    }
}