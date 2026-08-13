package com.brentversal.favorite.entity;

import com.brentversal.member.entity.Member;
import com.brentversal.property.entity.Property;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter @Setter @Entity
@Table(
        name = "favorites",
        // 같은 회원이 같은 매물을 두 번 찜할 수 없도록 DB 레벨에서 막는다 (토글 로직이 꼬여도 안전망 역할)
        uniqueConstraints = @UniqueConstraint(columnNames = {"member_id", "property_id"})
)
public class Favorite {

    // 복합키를 하나의 객체(FavoriteId)로 감싸서 @EmbeddedId로 선언한다.
    @EmbeddedId
    private FavoriteId id = new FavoriteId();

    @MapsId("memberId")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id", nullable = false)
    private Member member;

    @MapsId("propertyId")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "property_id", nullable = false)
    private Property property;

    @Column(name = "created_at")
    private LocalDateTime createdAt;
}