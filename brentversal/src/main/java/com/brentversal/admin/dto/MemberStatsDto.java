package com.brentversal.admin.dto;

import lombok.Getter;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

/*
  관리자 홈 "회원 통계" 카드 전체.

  화면정의서에는 "정지 회원"도 함께 적혀 있지만, 회원 엔터티(Member)에 정지 여부를
  나타내는 컬럼 자체가 없어 지금은 만들 수 없다. 있는 자료(전체 회원 수·신규 가입·
  역할 비중·월별 가입 추이)만 우선 채운다.
*/
@Getter @Setter
public class MemberStatsDto {
    private long totalCount;      // 전체 회원 수
    private long newThisMonth;    // 이번 달 신규 가입자 수

    private List<MemberRoleCountDto> roleCounts = new ArrayList<>();

    private List<MemberMonthlySignupDto> trend = new ArrayList<>();
    private long trendMonths; // 몇 달치를 보여 주는지 (그래프 눈금 수)
}
