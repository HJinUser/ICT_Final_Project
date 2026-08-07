package com.brentversal.member.constant;

// 공인중개사의 개설등록번호의 형식 종류
// 2015년도 기준으로 형식이 달라짐
public enum LicenseType {
    CURRENT, //현시대 표준 방식 (지역코드5-연도4-일련번호5)
    LEGACY_NUMERIC, //2015년도 이전 숫자방식
    LEGACY_HANGUL, //2015년도 이전 한글 섞인 방식
    UNKNOWN //기타 형식 번호
}
