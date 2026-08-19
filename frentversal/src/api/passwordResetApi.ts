/*
  비밀번호 찾기(재설정) API 호출을 모아 둔 파일.

  화면(FindPasswordPage)은 이 파일의 함수만 부르므로, 서버 경로나 응답 구조가 바뀌어도
  여기만 고치면 되고 화면 코드는 그대로 둘 수 있다. (authApi.ts 등과 같은 구조)

  세 경로 모두 로그인하지 않은 사람이 부르지만, 프로젝트 규칙대로 raw axios 가 아니라
  axiosInstance 를 쓴다. 기본 주소(API_BASE_URL)와 오류 처리를 한곳에서 관리하기 위해서다.
*/

import customAxios from './axiosInstance';
import type {
    ConfirmResetResponse,
    SendCodeResponse,
    VerifyCodeResponse,
} from '../types/PasswordReset';

// 1단계: 입력한 이메일로 인증번호를 보낸다.
// 가입되지 않은 이메일이어도 서버가 같은 성공 응답을 준다(가입 여부 숨김).
export async function sendResetCode(email: string): Promise<SendCodeResponse> {
    const response = await customAxios.post<SendCodeResponse>(
        '/member/password/reset/send',
        { email },
    );
    return response.data;
}

// 2단계: 인증번호를 확인하고 재설정 토큰을 받는다.
export async function verifyResetCode(email: string, code: string): Promise<VerifyCodeResponse> {
    const response = await customAxios.post<VerifyCodeResponse>(
        '/member/password/reset/verify',
        { email, code },
    );
    return response.data;
}

// 3단계: 받은 토큰과 새 비밀번호로 변경을 끝낸다.
// 이메일은 보내지 않는다. 대상 회원은 서버가 토큰 안의 값으로만 정한다.
export async function confirmNewPassword(
    resetToken: string,
    newPassword: string,
): Promise<ConfirmResetResponse> {
    const response = await customAxios.post<ConfirmResetResponse>(
        '/member/password/reset/confirm',
        { resetToken, newPassword },
    );
    return response.data;
}
