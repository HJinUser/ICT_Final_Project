package com.brentversal.tag.entity;

import com.brentversal.tag.constant.TagCategory;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

// 태그 하나. property_tag(매물↔태그), member_tag(회원↔태그) 양쪽에서 공용으로 참조하는 테이블이라
// property 패키지가 아니라 독립된 tag 패키지에 둔다.
@Getter @Setter @Entity
@Table(name = "tag")
public class Tag {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    @Column(name = "id")
    private Long id;

    @NotBlank(message = "태그 이름은 필수 입력 사항입니다.")
    @Column(name = "name", length = 50, nullable = false, unique = true)
    private String name;

    @NotNull(message = "태그 분류는 필수 선택 사항입니다.")
    @Enumerated(EnumType.STRING)
    @Column(name = "category", length = 20, nullable = false)
    private TagCategory category;
}