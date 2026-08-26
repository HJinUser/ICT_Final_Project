package com.brentversal.agency.dto;

import lombok.Getter;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

/*
  중개인 홈("처리할 내 매물")의 아래 두 칸에 들어가는 자료를 한 번에 담는다.

    매물 반응 추이 : 최근 몇 달간 내 매물이 받은 관심·평가·상담 (trend)
    머신러닝 평가   : 좋아요·싫어요 비중, 싫어요가 많은 매물, 오래 남아 있는 매물

  두 칸이 같은 화면에서 함께 그려지고 둘 다 "내 사무소"라는 같은 기준으로 모으는 자료라,
  요청을 두 번 보내지 않도록 하나로 묶었다.
*/
@Getter @Setter
public class MyAgencyInsightsDto {

    // ── 매물 반응 추이 ────────────────────────────────────────
    private List<MonthlyReactionDto> trend = new ArrayList<>();

    private long trendTotal ;      // 기간 전체 반응 합계
    private long trendMonths ;     // 몇 달치를 보여 주는지 (그래프 눈금 수)

    // ── 머신러닝 평가 ─────────────────────────────────────────
    private long likeCount ;
    private long dislikeCount ;
    private long feedbackTotal ;

    // 좋아요 비중(%). 평가가 하나도 없으면 0 이고, 화면은 안내 문구로 대신한다.
    private double likeRatio ;

    // 싫어요 비중이 높은 매물 (평가를 받은 매물 중에서만 고른다)
    private List<FeedbackPropertyDto> dislikedProperties = new ArrayList<>();

    // 게시중인데 오래 남아 있는 매물
    private List<StalePropertyDto> staleProperties = new ArrayList<>();
}
