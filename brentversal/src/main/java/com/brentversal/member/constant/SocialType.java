package com.brentversal.member.constant;

// 소셜 로그인 종류
// 회원당 하나만 연결 가능하고, 한 번 연결하면 영구 고정(변경/해지 불가)이라
// 별도 테이블이 아니라 Member의 컬럼 하나로 둔다. NONE은 소셜 미연결 상태(기본값)다.
public enum SocialType {
    NONE, KAKAO, GOOGLE, NAVER
}
