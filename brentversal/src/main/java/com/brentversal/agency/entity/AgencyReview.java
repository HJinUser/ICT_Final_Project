package com.brentversal.agency.entity;

import com.brentversal.member.entity.Member;
import jakarta.persistence.*;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

import java.time.LocalDateTime;

// 중개사무소에 대한 이용자 한줄 평가 1건을 의미하는 엔터티 클래스
// 상담 요청을 보낸 적이 있는 회원만 작성할 수 있다 (확인은 AgencyReviewService 에서 한다).
@Getter @Setter @ToString @Entity
@Table(name = "agency_reviews")
public class AgencyReview {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    @Column(name = "review_id")
    private Long id ;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "agency_id", nullable = false)
    @ToString.Exclude
    private Agency agency ;

    // 후기를 쓴 회원
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id", nullable = true)
    @ToString.Exclude
    private Member member ;

    @Min(value = 1, message = "별점은 1점 이상이어야 합니다.")
    @Max(value = 5, message = "별점은 5점을 초과할 수 없습니다.")
    @Column(nullable = false)
    private Integer rating ; // 별점 1~5

    @NotBlank(message = "후기 내용은 필수 입력 사항입니다.")
    @Size(max = 500, message = "후기는 500자 이하로 입력해 주세요.")
    @Column(length = 500, nullable = false)
    private String content ; // 한줄 후기

    @Column(name = "created_at")
    private LocalDateTime createdAt ;

    // ── 중개인이 다는 답변 ───────────────────────────────
    // 중개인 마이페이지의 "리뷰 관리" 탭에서 작성한다.
    // 값이 null 이면 미답변 리뷰로 세어 화면 상단에 개수를 표시한다.
    @Column(length = 1000)
    private String reply ;

    @Column(name = "replied_at")
    private LocalDateTime repliedAt ; // 답변을 단 시각 (미답변이면 null)
}
