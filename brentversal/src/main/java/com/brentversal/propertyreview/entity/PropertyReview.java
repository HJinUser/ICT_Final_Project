package com.brentversal.propertyreview.entity;

import com.brentversal.member.entity.Member;
import com.brentversal.property.entity.Property;
import jakarta.persistence.*;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

import java.time.LocalDateTime;

// 매물 하나에 대한 이용자 한줄평 1건.
//
// 중개사무소 후기(AgencyReview)와 구조가 비슷하지만 대상이 다르다.
// 그쪽은 사무소를, 이쪽은 매물을 평가한다.
//
// 한 사람은 같은 매물에 한 개만 남길 수 있다. 다시 쓰면 기존 글을 고친다.
// 그래서 (property_id, member_id)에 유니크 제약을 둔다.
@Getter @Setter @ToString @Entity
@Table(
        name = "property_reviews",
        uniqueConstraints = @UniqueConstraint(columnNames = {"property_id", "member_id"})
)
public class PropertyReview {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    @Column(name = "review_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "property_id", nullable = false)
    @ToString.Exclude
    private Property property;

    // 한줄평을 쓴 회원
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id", nullable = true)
    @ToString.Exclude
    private Member member;

    @Min(value = 1, message = "별점은 1점 이상이어야 합니다.")
    @Max(value = 5, message = "별점은 5점을 초과할 수 없습니다.")
    @Column(nullable = false)
    private Integer rating; // 별점 1~5

    @NotBlank(message = "한줄평 내용은 필수 입력 사항입니다.")
    @Size(max = 500, message = "한줄평은 500자 이하로 입력해 주세요.")
    @Column(length = 500, nullable = false)
    private String content;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    // 고쳐 쓴 시각. 처음 쓸 때는 createdAt 과 같은 값이 들어간다.
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
