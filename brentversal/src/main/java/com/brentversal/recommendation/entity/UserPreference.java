package com.brentversal.recommendation.entity;

import com.brentversal.member.entity.Member;
import com.brentversal.property.constant.DealType;
import com.brentversal.property.constant.PropertyType;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

// 사용자별 거래 유형, 매물 유형, 선호 지역, 예산, 면적, 생활환경 선호를 저장하는 취향 엔터티다.
// 맞춤 추천 점수 중 "직접 설정한 취향 57%" 부분의 입력값이 전부 여기에서 나온다.
//
// 선호 태그(preferredTags)만 이 엔터티가 아니라 Member 가 직접 가진다.
// member_tag 테이블의 member_id 가 members.member_id 를 그대로 참조해야 의미가 분명하기 때문이다.
@Getter
@Setter
@ToString
@Entity
@Table(name = "user_preference")
public class UserPreference {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "preference_id")
    private Long id;

    // 회원 한 명당 취향은 하나만 존재한다.
    @ToString.Exclude
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id", nullable = false, unique = true)
    private Member member;

    // 가장 중요하게 보는 거래 유형. 고르지 않았으면 null 이고, 그때는 거래 유형 점수를 계산하지 않는다.
    @Enumerated(EnumType.STRING)
    @Column(name = "preferred_deal_type", length = 20)
    private DealType preferredDealType;

    @ElementCollection(targetClass = PropertyType.class)
    @CollectionTable(
            name = "member_preferred_property_type",
            joinColumns = @JoinColumn(name = "preference_id")
    )
    @Enumerated(EnumType.STRING)
    @Column(name = "property_type")
    private Set<PropertyType> preferredPropertyTypes = new HashSet<>();

    // 선호 지역은 자치구 이름을 그대로 담는다. 매물의 sigungu 와 같은 값이라 조회할 때 바로 비교할 수 있다.
    @ElementCollection
    @CollectionTable(
            name = "member_preferred_district",
            joinColumns = @JoinColumn(name = "preference_id")
    )
    @Column(name = "district_name", length = 20)
    private Set<String> preferredDistricts = new HashSet<>();

    private Double minArea;
    private Double maxArea;
    private Integer minRoomCount;

    // 예산은 거래 유형마다 쓰는 금액 칸이 달라서 항목을 따로 둔다. 단위는 매물과 같은 만원이다.
    private Long saleMinPrice;
    private Long saleMaxPrice;
    private Long jeonseMinDeposit;
    private Long jeonseMaxDeposit;
    private Long monthlyMinDeposit;
    private Long monthlyMaxDeposit;
    private Long monthlyMinRent;
    private Long monthlyMaxRent;

    // 생활환경 선호. 각 항목이 맞춤 추천 가중치 표의 한 줄에 그대로 대응된다.
    private boolean newBuildPreferred;
    private boolean stationPreferred;
    private boolean educationPreferred;
    private boolean parkPreferred;
    private boolean hospitalPreferred;
    private boolean conveniencePreferred;
    private boolean busPreferred;
    private boolean lowMaintenancePreferred;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
