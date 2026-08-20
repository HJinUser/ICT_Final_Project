/*
  비밀번호 찾기(재설정)에서 쓰는 타입과 정책 값.

  화면(FindPasswordPage)에는 타입을 직접 선언하지 않고 전부 여기에 모은다.
*/

/*
  화면이 지금 어느 단계에 있는지.

    email    : 이메일 입력 (인증번호 받기 전)
    code     : 메일로 받은 6자리 입력
    password : 새 비밀번호 설정
    done     : 변경 완료 안내
*/
export type PasswordResetStep = 'email' | 'code' | 'password' | 'done';

// 1단계 응답. 가입 여부를 숨기려고 서버가 어느 경우든 같은 문구를 돌려준다.
export type SendCodeResponse = {
    message: string;
};

// 2단계 응답. resetToken 은 3단계에서 그대로 다시 보내야 하는 단기 토큰(10분)이다.
export type VerifyCodeResponse = {
    resetToken: string;
    message: string;
};

export type ConfirmResetResponse = {
    message: string;
};

/*
  정책 값.

  서버(PasswordResetService)가 갖고 있는 값과 같은 숫자를 화면에도 둔다.
  서버가 남은 시간을 응답으로 알려 주지 않기 때문에, 화면이 직접 세어서 안내해야 한다.
  서버 쪽 상수를 바꾸면 이 값도 같이 맞춰야 한다.
*/
export const CODE_LENGTH = 6;
export const CODE_TTL_SECONDS = 5 * 60;      // 인증번호 유효 시간 (5분)
export const RESEND_COOLDOWN_SECONDS = 60;   // 재전송 버튼이 다시 열릴 때까지 (60초)

// 비밀번호 규칙. 서버 PasswordPolicy.java 와 같은 조건이다.
export const PASSWORD_MIN_LENGTH = 8;

/*
  새 비밀번호가 규칙에 맞는지 확인해서, 어긋나면 안내 문구를 돌려준다.
  규칙에 맞으면 빈 문자열을 돌려준다.

  서버가 최종 판정을 하지만, 화면에서 미리 걸러 주면 사용자가 제출하고 기다렸다가
  거절당하는 왕복을 줄일 수 있다.
*/
export function validateNewPassword(password: string): string {
    if (!password) {
        return '비밀번호를 입력해 주세요.';
    }

    if (password.length < PASSWORD_MIN_LENGTH) {
        return `비밀번호는 ${PASSWORD_MIN_LENGTH}자 이상 입력해 주세요.`;
    }

    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasDigit = /[0-9]/.test(password);
    // 영문자도 숫자도 아닌 글자를 특수문자로 본다(서버의 !Character.isLetterOrDigit 와 같은 기준)
    const hasSpecial = /[^A-Za-z0-9]/.test(password);

    if (!(hasUpper && hasLower && hasDigit && hasSpecial)) {
        return '대문자, 소문자, 숫자, 특수문자를 모두 포함해 주세요.';
    }

    return '';
}
