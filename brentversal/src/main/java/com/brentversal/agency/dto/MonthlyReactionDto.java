package com.brentversal.agency.dto;

import lombok.Getter;
import lombok.Setter;

/*
  중개인 홈 "매물 반응 추이" 의 한 달치.

  화면정의서에는 "월별 조회수"로 적혀 있지만, 매물 상세를 몇 번 열었는지는 어디에도
  남기지 않는다(조회수 컬럼도, 열람 기록 테이블도 없다). 대신 사용자가 매물에 남긴
  행동은 시각까지 함께 저장돼 있어서, 그 셋을 합쳐 "반응"으로 보여 준다.

    관심 등록 : favorites.created_at
    추천 평가 : recommendation_feedback.updated_at  (좋아요·싫어요)
    상담 요청 : agency_consultations.created_at

  세 가지를 한 줄로 합치지 않고 따로 내려 주는 이유는, 같은 10건이라도
  "관심만 10건"과 "상담 10건"이 중개인에게 전혀 다른 신호이기 때문이다.
*/
@Getter @Setter
public class MonthlyReactionDto {
    private String month ;  // "2026-08" (정렬·키 용도)
    private String label ;  // "8월" (그래프 눈금에 그대로 쓴다)

    private long favoriteCount ;     // 관심 등록
    private long feedbackCount ;     // 추천 평가 (좋아요 + 싫어요)
    private long consultationCount ; // 상담 요청

    private long total ; // 위 셋의 합. 그래프 높이를 정하는 값이다.

    public static MonthlyReactionDto of(String month, String label,
                                        long favoriteCount, long feedbackCount, long consultationCount) {
        MonthlyReactionDto dto = new MonthlyReactionDto();

        dto.setMonth(month);
        dto.setLabel(label);
        dto.setFavoriteCount(favoriteCount);
        dto.setFeedbackCount(feedbackCount);
        dto.setConsultationCount(consultationCount);
        dto.setTotal(favoriteCount + feedbackCount + consultationCount);

        return dto;
    }
}
