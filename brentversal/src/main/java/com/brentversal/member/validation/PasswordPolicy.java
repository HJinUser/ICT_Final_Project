package com.brentversal.member.validation;

/*
  비밀번호 규칙을 한곳에 모아 둔 곳.

  원래는 MemberService.insert() 안에 직접 적혀 있었는데, 비밀번호 재설정에서도 똑같은 규칙을
  적용해야 해서 밖으로 꺼냈다. 규칙이 양쪽에 따로 있으면 한쪽만 고쳤을 때
  "가입은 되는데 재설정은 안 되는" 상태가 조용히 만들어진다.

  규칙이 바뀌면 이 파일만 고치면 가입·재설정에 함께 반영된다.
*/
public final class PasswordPolicy {

    // 최소 길이.
    // 종류 4가지(대문자/소문자/숫자/특수문자)만 요구하면 "Aa1!" 같은 4자리도 통과해 버린다.
    public static final int MIN_LENGTH = 8;

    // 유틸리티 클래스라 인스턴스를 만들지 못하게 막는다
    private PasswordPolicy() {
    }

    /*
      비밀번호가 규칙에 맞는지 확인한다. 맞지 않으면 IllegalArgumentException 을 던진다.

      값을 돌려주지 않고 예외로 알리는 이유는, 호출하는 쪽(가입·재설정)이 모두
      "규칙에 걸리면 그 자리에서 중단하고 메시지를 그대로 보여 주는" 형태이기 때문이다.
    */
    public static void validate(String password) {
        // null 체크는 다른 조건 검사보다 먼저 수행한다
        if (password == null || password.isBlank()) {
            throw new IllegalArgumentException("비밀번호를 입력해 주세요.");
        }

        if (password.length() < MIN_LENGTH) {
            throw new IllegalArgumentException("비밀번호는 " + MIN_LENGTH + "자 이상 입력해 주세요.");
        }

        boolean hasUpper = false;   // 대문자인지
        boolean hasLower = false;   // 소문자인지
        boolean hasDigit = false;   // 숫자인지
        boolean hasSpecial = false; // 특수기호인지

        for (char c : password.toCharArray()) {
            if (Character.isUpperCase(c)) {
                hasUpper = true;
            } else if (Character.isLowerCase(c)) {
                hasLower = true;
            } else if (Character.isDigit(c)) {
                hasDigit = true;
            } else if (!Character.isLetterOrDigit(c)) {
                hasSpecial = true;
            }
        }

        if (!(hasUpper && hasLower && hasDigit && hasSpecial)) {
            throw new IllegalArgumentException("비밀번호는 대문자, 소문자, 숫자, 특수문자가 포함되어야합니다.");
        }
    }
}
