package com.brentversal.agency.dto;

import com.brentversal.property.constant.DealType;
import com.brentversal.property.entity.Property;
import lombok.Getter;
import lombok.Setter;

/*
  중개인 홈 "머신러닝 평가" 의 매물 1건.

  추천 화면에서 사용자가 남긴 좋아요·싫어요(recommendation_feedback)를 매물별로 모으고,
  그 매물의 호가와 AI 예상 시세를 함께 담는다.

  싫어요가 많은 매물은 대개 호가가 예상 시세보다 높다. 그래서 "싫어요 비중"만 보여 주면
  중개인이 무엇을 해야 할지 알 수 없고, 옆에 권장 호가(AI 예상 시세)와 차이를 함께 놓아야
  "얼마나 내려야 하는지"까지 한눈에 보인다.
*/
@Getter @Setter
public class FeedbackPropertyDto {
    private Long propertyId ;
    private String name ;
    private String dealType ;      // SALE / JEONSE / MONTHLY
    private String statusLabel ;   // 게시중 / 거래 진행중 ...

    private long likeCount ;
    private long dislikeCount ;
    private long totalCount ;

    // 싫어요 비중(%). 소수 첫째 자리까지 반올림한다.
    private double dislikeRatio ;

    private String priceLabel ;          // 지금 호가 "전세 4억 9,000만 원"
    private String suggestedPriceLabel ; // AI 예상 시세(권장 호가). 예측 전이면 null

    /*
      호가가 AI 예상 시세보다 몇 % 높은지(양수) 또는 낮은지(음수).
      예상 시세가 없거나 0이면 null 이고, 화면은 그 줄을 보여 주지 않는다.
    */
    private Double gapPercent ;

    public static FeedbackPropertyDto of(Property bean, long likeCount, long dislikeCount) {
        FeedbackPropertyDto dto = new FeedbackPropertyDto();

        dto.setPropertyId(bean.getId());
        dto.setName(bean.getName());
        dto.setDealType(bean.getDealType() == null ? null : bean.getDealType().name());

        if (bean.getStatus() != null) {
            dto.setStatusLabel(AgencyPropertyDto.toStatusLabel(bean.getStatus().name()));
        }

        long total = likeCount + dislikeCount;

        dto.setLikeCount(likeCount);
        dto.setDislikeCount(dislikeCount);
        dto.setTotalCount(total);
        dto.setDislikeRatio(total == 0 ? 0 : Math.round(dislikeCount * 1000.0 / total) / 10.0);

        Long asking = primaryPrice(bean);
        Long suggested = primaryAiPrice(bean);

        dto.setPriceLabel(priceLabel(bean, asking, bean.getMonthlyRent()));
        dto.setSuggestedPriceLabel(
                suggested == null ? null : priceLabel(bean, suggested, bean.getAiMonthlyRent()));

        // 예상 시세가 0이면 나눌 수 없다. 그런 자료는 비교하지 않고 넘어간다.
        if (asking != null && suggested != null && suggested != 0) {
            dto.setGapPercent(Math.round((asking - suggested) * 1000.0 / suggested) / 10.0);
        }

        return dto;
    }

    // 거래 유형에 따라 실제로 비교할 호가 하나를 뽑는다 (월세는 보증금 기준).
    private static Long primaryPrice(Property bean) {
        if (bean.getDealType() == null) return null;

        return switch (bean.getDealType()) {
            case SALE -> bean.getPrice();
            case JEONSE -> bean.getDeposit();
            case MONTHLY -> bean.getMonthlyDeposit();
        };
    }

    // 위와 같은 기준의 AI 예상 시세. 아직 예측하지 않았으면 null 이다.
    private static Long primaryAiPrice(Property bean) {
        if (bean.getDealType() == null) return null;

        return switch (bean.getDealType()) {
            case SALE -> bean.getAiPrice();
            case JEONSE -> bean.getAiDeposit();
            case MONTHLY -> bean.getAiMonthlyDeposit();
        };
    }

    // 화면에 그대로 쓸 금액 문구. 월세만 "보증금/월세" 두 값을 함께 보여 준다.
    private static String priceLabel(Property bean, Long amount, Long monthlyRent) {
        DealType dealType = bean.getDealType();

        if (dealType == null || amount == null) return "";

        return switch (dealType) {
            case SALE -> "매매 " + toMoney(amount);
            case JEONSE -> "전세 " + toMoney(amount);
            case MONTHLY -> "월세 " + toMoney(amount)
                    + "/" + (monthlyRent == null ? "" : String.format("%,d", monthlyRent));
        };
    }

    // 만원 단위 숫자를 "4억 9,000만 원" 형태로 바꾼다 (담당 매물 카드와 같은 규칙).
    private static String toMoney(Long manwon) {
        if (manwon == null) return "";

        long eok = manwon / 10000;
        long rest = manwon % 10000;

        if (eok > 0 && rest > 0) return eok + "억 " + String.format("%,d", rest) + "만 원";
        if (eok > 0) return eok + "억";

        return String.format("%,d", rest) + "만 원";
    }
}
