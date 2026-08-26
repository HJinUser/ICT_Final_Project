package com.brentversal.admin.dto;

import lombok.Getter;
import lombok.Setter;

// 관리자 홈 "회원 통계" 가입 추이의 한 달치
@Getter @Setter
public class MemberMonthlySignupDto {
    private String month; // "2026-08" (정렬·키 용도)
    private String label; // "8월" (그래프 눈금에 그대로 쓴다)
    private long count;

    public static MemberMonthlySignupDto of(String month, String label, long count) {
        MemberMonthlySignupDto dto = new MemberMonthlySignupDto();

        dto.setMonth(month);
        dto.setLabel(label);
        dto.setCount(count);

        return dto;
    }
}
