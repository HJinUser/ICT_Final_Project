package com.brentversal.tag.dto;

import com.brentversal.tag.entity.Tag;
import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class TagResponseDto {
    private Long id;
    private String name;
    private String category; // TagCategory enum 이름 (예: MOOD)

    public static TagResponseDto of(Tag bean) {
        TagResponseDto dto = new TagResponseDto();
        dto.setId(bean.getId());
        dto.setName(bean.getName());
        if (bean.getCategory() != null) {
            dto.setCategory(bean.getCategory().name());
        }
        return dto;
    }
}
