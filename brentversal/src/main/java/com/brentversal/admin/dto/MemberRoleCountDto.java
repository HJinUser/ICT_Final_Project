package com.brentversal.admin.dto;

import com.brentversal.member.constant.Role;
import lombok.Getter;
import lombok.Setter;

// 관리자 홈 "회원 통계" 의 역할 비중 한 칸 (일반 사용자 / 중개인 / 관리자)
@Getter @Setter
public class MemberRoleCountDto {
    private Role role;
    private String roleLabel; // "일반 사용자" / "중개인" / "관리자"
    private long count;

    public static MemberRoleCountDto of(Role role, long count) {
        MemberRoleCountDto dto = new MemberRoleCountDto();

        dto.setRole(role);
        dto.setRoleLabel(toLabel(role));
        dto.setCount(count);

        return dto;
    }

    private static String toLabel(Role role) {
        return switch (role) {
            case USER -> "일반 사용자";
            case BROKER -> "중개인";
            case ADMIN -> "관리자";
        };
    }
}
