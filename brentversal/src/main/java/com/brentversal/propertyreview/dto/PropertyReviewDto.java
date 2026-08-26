package com.brentversal.propertyreview.dto;

import com.brentversal.propertyreview.entity.PropertyReview;
import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

// 매물 한줄평 1건을 화면으로 내보내기 위한 DTO
@Getter @Setter
public class PropertyReviewDto {
    private Long id;
    private String writerName; // 작성자 이름 (가운데 글자를 가린 형태)
    private Integer rating;    // 별점 1~5
    private String content;

    @JsonFormat(pattern = "yyyy.MM.dd")
    private LocalDateTime createdAt;

    // 로그인한 사람이 쓴 글인지. 화면에서 "내가 쓴 한줄평"을 구분해 보여 줄 때 쓴다.
    private boolean mine;

    public static PropertyReviewDto of(PropertyReview bean, Long viewerMemberId){
        PropertyReviewDto dto = new PropertyReviewDto();

        dto.setId(bean.getId());
        dto.setRating(bean.getRating());
        dto.setContent(bean.getContent());
        // 고쳐 쓴 글은 고친 시각을 보여 준다. 목록도 그 순서로 정렬한다.
        dto.setCreatedAt(bean.getUpdatedAt());

        Long writerId = (bean.getMember() == null) ? null : bean.getMember().getId();
        dto.setWriterName(mask(bean.getMember() == null ? null : bean.getMember().getName()));
        dto.setMine(viewerMemberId != null && viewerMemberId.equals(writerId));

        return dto;
    }

    // 한줄평은 비회원도 보는 정보라 작성자 이름을 그대로 노출하지 않고 가운데를 가린다.
    // 예) 홍길동 -> 홍*동, 김철 -> 김*
    private static String mask(String name){
        if(name == null || name.isBlank()) return "탈퇴한 회원";
        if(name.length() == 1) return name;
        if(name.length() == 2) return name.charAt(0) + "*";

        return name.charAt(0) + "*".repeat(name.length() - 2) + name.charAt(name.length() - 1);
    }
}
