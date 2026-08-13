package com.brentversal.agency.dto;

import lombok.Getter;
import lombok.Setter;

// 중개인 마이페이지 상단 대시보드에 표시할 숫자 모음
//
// 화면 여러 곳에서 조금씩 필요한 숫자를 매번 따로 요청하지 않도록 한 번에 담아 내려 준다.
@Getter @Setter
public class MyAgencyDashboardDto {
    // 매물 현황 (위에서 아래로 배치되는 항목들)
    private long totalCount ;       // 등록 매물 수 (상태와 상관없이 전체)
    private long activeCount ;      // 게시 중
    private long inProgressCount ;  // 거래 진행 중
    private long completedCount ;   // 거래 완료
    private long pendingCount ;     // 승인 대기

    // 문의(상담) 현황 - 상담 요청 -> 확정 -> 완료 순서
    private long requestedConsultationCount ; // 상담 요청 (아직 답변하지 않음) - 알림 배지에 쓰는 숫자
    private long acceptedConsultationCount ;  // 상담 확정
    private long doneConsultationCount ;      // 상담 완료

    // 평가 현황
    private double ratingAvg ;          // 평균 평점
    private long reviewCount ;          // 전체 리뷰 수
    private long unansweredReviewCount ;// 미답변 리뷰 수
}
