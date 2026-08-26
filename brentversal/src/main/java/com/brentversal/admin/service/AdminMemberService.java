package com.brentversal.admin.service;

import com.brentversal.admin.dto.MemberMonthlySignupDto;
import com.brentversal.admin.dto.MemberRoleCountDto;
import com.brentversal.admin.dto.MemberStatsDto;
import com.brentversal.member.constant.Role;
import com.brentversal.member.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.YearMonth;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/*
  관리자 홈 "회원 통계" 서비스.

  권한 확인은 SecurityConfig 에서 /admin/** 을 ROLE_ADMIN 으로 막아 두었으므로
  여기서 다시 하지 않는다.
*/
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminMemberService {

    private final MemberRepository memberRepository;

    // 가입 추이는 최근 6개월을 보여 준다 (메인 화면의 작은 카드에 맞춘 길이)
    private static final int TREND_MONTHS = 6;

    public MemberStatsDto getStats() {
        MemberStatsDto dto = new MemberStatsDto();

        dto.setTotalCount(memberRepository.count());
        dto.setNewThisMonth(memberRepository.countByRegdateGreaterThanEqual(YearMonth.now().atDay(1)));

        List<MemberRoleCountDto> roleCounts = new ArrayList<>();

        for (Role role : Role.values()) {
            roleCounts.add(MemberRoleCountDto.of(role, memberRepository.countByRole(role)));
        }

        dto.setRoleCounts(roleCounts);

        YearMonth firstMonth = YearMonth.now().minusMonths(TREND_MONTHS - 1L);
        Map<String, Long> byMonth = toMonthlyMap(
                memberRepository.countMonthlySignups(firstMonth.atDay(1)));

        List<MemberMonthlySignupDto> trend = new ArrayList<>();

        // 자료가 없는 달도 빈칸으로 그려야 추이가 이어져 보인다. 그래서 달을 먼저 만들고 값을 채운다.
        for (int i = 0; i < TREND_MONTHS; i++) {
            YearMonth month = firstMonth.plusMonths(i);
            String key = month.toString(); // "2026-08"

            trend.add(MemberMonthlySignupDto.of(
                    key,
                    month.getMonthValue() + "월",
                    byMonth.getOrDefault(key, 0L)));
        }

        dto.setTrend(trend);
        dto.setTrendMonths(TREND_MONTHS);

        return dto;
    }

    // [연, 월, 건수] 집계 결과를 "2026-08" -> 건수 형태로 바꾼다.
    private Map<String, Long> toMonthlyMap(List<Object[]> rows) {
        Map<String, Long> result = new HashMap<>();

        for (Object[] row : rows) {
            int year = toIntValue(row[0]);
            int month = toIntValue(row[1]);

            result.put(YearMonth.of(year, month).toString(), toLongValue(row[2]));
        }

        return result;
    }

    // 집계 질의가 돌려주는 숫자는 DB 에 따라 Long·Integer·BigInteger 로 섞여 온다.
    // 형 변환에서 터지지 않도록 Number 로 받아 한 가지로 맞춘다.
    private int toIntValue(Object value) {
        return (value instanceof Number number) ? number.intValue() : 0;
    }

    private long toLongValue(Object value) {
        return (value instanceof Number number) ? number.longValue() : 0L;
    }
}
