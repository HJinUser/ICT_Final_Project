package com.brentversal.agency.dto;

import com.brentversal.property.entity.Property;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;

/*
  중개인 홈 "머신러닝 평가" 의 오래 남아 있는 매물 1건.

  게시중인데 등록한 지 오래된 매물은 호가나 사진을 손볼 때가 됐다는 신호다.
  며칠째인지(daysOnMarket)와 지금 받은 반응(관심·평가)을 함께 보여 준다.
*/
@Getter @Setter
public class StalePropertyDto {
    private Long propertyId ;
    private String name ;
    private String priceLabel ;
    private String statusLabel ;

    private String createdAt ;   // "2026-07-02"
    private long daysOnMarket ;  // 등록일로부터 며칠 지났는지

    private long favoriteCount ; // 지금까지 받은 관심 등록 수
    private long dislikeCount ;  // 지금까지 받은 싫어요 수

    public static StalePropertyDto of(Property bean, LocalDateTime now,
                                      long favoriteCount, long dislikeCount) {
        StalePropertyDto dto = new StalePropertyDto();

        dto.setPropertyId(bean.getId());
        dto.setName(bean.getName());

        // 가격·상태 문구는 담당 매물 카드와 같은 규칙을 그대로 쓴다
        AgencyPropertyDto card = AgencyPropertyDto.of(bean);
        dto.setPriceLabel(card.getPriceLabel());
        dto.setStatusLabel(card.getStatusLabel());

        LocalDateTime createdAt = bean.getCreatedAt();

        if (createdAt != null) {
            dto.setCreatedAt(createdAt.toLocalDate().toString());
            // 등록일이 미래로 잘못 들어간 자료가 섞여도 음수 일수가 나오지 않게 0 으로 막는다
            dto.setDaysOnMarket(Math.max(0, ChronoUnit.DAYS.between(createdAt.toLocalDate(), LocalDate.from(now))));
        }

        dto.setFavoriteCount(favoriteCount);
        dto.setDislikeCount(dislikeCount);

        return dto;
    }
}
