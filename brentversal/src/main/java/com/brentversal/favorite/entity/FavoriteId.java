package com.brentversal.favorite.entity;

import jakarta.persistence.Embeddable;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.io.Serializable;

// favorite 테이블의 복합키(member_id + property_id). ERD에서 favorite을 별도 id 없이
// (member_id, property_id) 조합 자체를 기본키로 설계해 둬서 그대로 맞춘다.
// @EmbeddedId로 쓰려면 JPA 스펙상 Serializable + equals/hashCode + 기본생성자가 있어야 한다.
@Embeddable
@Getter @Setter
@EqualsAndHashCode
@NoArgsConstructor
public class FavoriteId implements Serializable {
    private Long memberId;
    private Long propertyId;

    public FavoriteId(Long memberId, Long propertyId) {
        this.memberId = memberId;
        this.propertyId = propertyId;
    }
}
