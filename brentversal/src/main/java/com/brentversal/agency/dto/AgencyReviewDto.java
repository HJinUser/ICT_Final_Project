package com.brentversal.agency.dto;

import com.brentversal.agency.entity.AgencyReview;
import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

// 이용자 평가(후기) 1건을 클라이언트로 내보내기 위한 DTO
@Getter @Setter
public class AgencyReviewDto {
    private Long id ;
    private String writerName ; // 작성자 이름 (가운데 글자를 가린 형태)
    private Integer rating ;    // 별점 1~5
    private String content ;    // 한줄 후기

    @JsonFormat(pattern = "yyyy.MM.dd")
    private LocalDateTime createdAt ;

    // 중개인이 단 답변. 아직 답변하지 않았으면 null 이다.
    // 중개사무소 상세 페이지에서는 후기 아래에 답변을 함께 보여 주고,
    // 중개인 마이페이지의 리뷰 관리 탭에서는 이 값이 null 인 것만 "미답변"으로 센다.
    private String reply ;

    @JsonFormat(pattern = "yyyy.MM.dd")
    private LocalDateTime repliedAt ;

    public static AgencyReviewDto of(AgencyReview bean){
        AgencyReviewDto dto = new AgencyReviewDto();

        dto.setId(bean.getId());
        dto.setRating(bean.getRating());
        dto.setContent(bean.getContent());
        dto.setCreatedAt(bean.getCreatedAt());
        dto.setReply(bean.getReply());
        dto.setRepliedAt(bean.getRepliedAt());
        dto.setWriterName(mask(bean.getMember() == null ? null : bean.getMember().getName()));

        return dto;
    }

    // 후기는 누구나 볼 수 있는 정보라서 작성자 이름을 그대로 노출하지 않고 가운데를 가린다.
    // 예) 홍길동 -> 홍*동, 김철 -> 김*
    private static String mask(String name){
        if(name == null || name.isBlank()) return "이용자";
        if(name.length() == 1) return name;
        if(name.length() == 2) return name.charAt(0) + "*";

        return name.charAt(0) + "*".repeat(name.length() - 2) + name.charAt(name.length() - 1);
    }
}
