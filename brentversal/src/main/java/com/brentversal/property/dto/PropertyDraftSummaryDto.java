package com.brentversal.property.dto;

// 이 클래스에서 사용할 Java/Spring/프로젝트 타입 불러옴
import com.brentversal.property.entity.Property;

import java.time.LocalDateTime;

// 임시저장 목록에 필요한 DRAFT ID·매물명·마지막 수정시각만 내려주는 요약 DTO record임
public record PropertyDraftSummaryDto(
        Long id,
        String name,
        LocalDateTime updatedAt
) {
    // Property Entity에서 ID·매물명·updatedAt만 꺼내 임시저장 목록 DTO로 변환하는 정적 메서드임
    public static PropertyDraftSummaryDto of(Property property) {
        // 처리 완료된 결과를 호출한 쪽으로 반환함
        return new PropertyDraftSummaryDto(
                property.getId(),
                property.getName(),
                property.getUpdatedAt()
        );
    }
}