package com.brentversal.recommendation.entity;

import com.brentversal.member.entity.Member;
import com.brentversal.property.entity.Property;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.MapsId;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

import java.time.LocalDateTime;

// 사용자가 별표로 지정한 BEST 매물 한 건을 저장하는 엔터티다.
//
// 기본키를 member_id 로 두고 @MapsId 로 회원과 공유한다.
// 이렇게 하면 "한 사람당 BEST 는 하나"라는 규칙을 애플리케이션 코드가 아니라 DB 구조가 보장한다.
// 추천 목록에서 첫 번째 카드 자리를 이 매물이 계속 차지한다.
@Getter
@Setter
@ToString
@Entity
@Table(name = "recommendation_best")
public class RecommendationBest {

    @Id
    @Column(name = "member_id")
    private Long memberId;

    @ToString.Exclude
    @MapsId
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id")
    private Member member;

    @ToString.Exclude
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "property_id", nullable = false)
    private Property property;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
