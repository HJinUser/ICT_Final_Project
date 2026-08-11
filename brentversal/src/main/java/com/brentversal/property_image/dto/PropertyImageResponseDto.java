package com.brentversal.property_image.dto;

import com.brentversal.property_image.entity.PropertyImage;
import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class PropertyImageResponseDto {
    private Long id;
    private String url;
    private Boolean isMain;
    private Integer sortOrder;

    public static PropertyImageResponseDto of (PropertyImage bean) {
        PropertyImageResponseDto dto = new PropertyImageResponseDto();
        dto.setId(bean.getId());
        dto.setUrl(bean.getUrl());
        dto.setIsMain(bean.getIsMain());
        dto.setSortOrder(bean.getSortOrder());
        return dto;
    }
}
