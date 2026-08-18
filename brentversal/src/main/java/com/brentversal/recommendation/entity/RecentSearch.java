package com.brentversal.recommendation.entity;

import com.brentversal.member.entity.Member;
import com.brentversal.property.constant.DealType;
import com.brentversal.property.constant.PropertyType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

import java.time.LocalDateTime;

// 지도 검색에서 사용자가 실제로 걸었던 조건을 남겨 두는 엔터티다.
//
// 맞춤 추천 점수 중 "최근 검색 10%" 부분의 입력값이다.
// 취향 설정은 한 번 저장해 두면 잘 바뀌지 않는데, 실제로 지금 찾고 있는 조건은 검색에 드러나기 때문에
// 둘을 따로 보고 점수에 함께 반영한다.
@Getter
@Setter
@ToString
@Entity
@Table(name = "recent_search")
public class RecentSearch {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "recent_search_id")
    private Long id;

    @ToString.Exclude
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id", nullable = false)
    private Member member;

    @Column(name = "district_name", length = 20)
    private String districtName;

    @Enumerated(EnumType.STRING)
    @Column(name = "deal_type", length = 20)
    private DealType dealType;

    @Enumerated(EnumType.STRING)
    @Column(name = "property_type", length = 20)
    private PropertyType propertyType;

    private Long minPrice;
    private Long maxPrice;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
}
