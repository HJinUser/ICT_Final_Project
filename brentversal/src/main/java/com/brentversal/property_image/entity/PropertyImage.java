package com.brentversal.property_image.entity;

import com.brentversal.property.entity.Property;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Getter @Setter @Entity
@Table(name = "property_image")
public class PropertyImage {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    @Column(name = "property_image_id")
    private Long id;

    // 이 사진이 어느 매물의 것인지. Property 쪽의 images 리스트와 짝을 이룸(mappedBy)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "property_id", nullable = false)
    private Property property;

    @Column(name = "url", length = 500, nullable = false)
    private String url; // 사진 접근 URL

    @Column(name = "is_main")
    private Boolean isMain; // 대표(메인) 사진 여부. 첫 번째 사진이 true

    @Column(name = "sort_order")
    private Integer sortOrder; // 노출 순서

}
