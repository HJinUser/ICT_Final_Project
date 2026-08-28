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

    // 로그인한 사람이 쓴 글인지. 화면에서 "내가 쓴 한줄평"에만 수정·삭제 버튼을 보여 줄 때 쓴다.
    private boolean mine;

    // 일반 사용자와 중개인에게 보여 줄 작성자 표기.
    // 동네에 대한 솔직한 평을 남기게 하려면 누가 썼는지 드러나지 않아야 한다.
    private static final String ANONYMOUS = "익명";

    // 작성자가 탈퇴해 회원 정보가 남아 있지 않을 때 관리자 화면에 보여 줄 표기
    private static final String WITHDRAWN = "탈퇴한 회원";

    /*
      NeighborhoodReview Entity를 응답 DTO로 변환하는 정적 메서드임.

      revealAuthor 가 true 일 때만 실제 이름을 담는다. 관리자 화면에서 부적절한 글을 남긴 회원을
      찾아야 하므로 관리자에게만 열어 주고, 그 외에는 이름 대신 "익명"을 내려준다.

      이름을 담을지 말지를 화면이 아니라 서버에서 정하는 이유가 있다.
      전부 내려보내고 화면에서 가리면 응답 본문에 실명이 그대로 실려서,
      개발자 도구나 API 직접 호출만으로 누구나 볼 수 있게 된다.
    */
    public static NeighborhoodReviewResponseDto of(NeighborhoodReview review, boolean revealAuthor) {
        return of(review, revealAuthor, null);
    }

    // viewerMemberId 는 지금 요청을 보낸 로그인 회원의 id 다. 비로그인이면 null 이라 mine 은 항상 false 다.
    public static NeighborhoodReviewResponseDto of(NeighborhoodReview review, boolean revealAuthor, Long viewerMemberId) {
        NeighborhoodReviewResponseDto dto = new NeighborhoodReviewResponseDto();
        dto.setId(review.getId());
        dto.setMemberName(authorName(review, revealAuthor));
        dto.setAdminCode(review.getAdminCode());
        dto.setAdminName(review.getAdminName());
        dto.setDistrictName(review.getDistrictName());
        dto.setContent(review.getContent());
        dto.setUpdatedAt(review.getUpdatedAt());
        dto.setMine(viewerMemberId != null && review.getMember() != null
                && viewerMemberId.equals(review.getMember().getId()));
        // 처리 완료된 결과를 호출한 쪽으로 반환함
        return dto;
    }

    // 볼 수 있는 사람인지에 따라 실제 이름 또는 익명 표기를 고른다.
    private static String authorName(NeighborhoodReview review, boolean revealAuthor) {
        // 권한이 없는 요청에는 회원 정보를 아예 꺼내지 않는다
        if (!revealAuthor) {
            return ANONYMOUS;
        }

        // null 체크는 다른 조건 검사보다 먼저 수행한다
        if (review.getMember() == null || review.getMember().getName() == null
                || review.getMember().getName().isBlank()) {
            return WITHDRAWN;
        }

        return review.getMember().getName();
    }
}
