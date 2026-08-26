import customAxios from './axiosInstance';
import type {PasswordlessAuthStart, PasswordlessLoginResult, PasswordlessRegisterInfo} from "../types/Auth";

// 등록(QR) 요청. 비밀번호가 있는 계정(일반 회원)은 password로, 중개인처럼 비밀번호 없는 계정은 회원가입 응답으로 받은 signupToken으로 본인 확인한다. 필요한 쪽만 채워서 호출
export async function registerPasswordless(
    email: string,
    options: { password?: string; signupToken?: string }
): Promise<PasswordlessRegisterInfo> {
    const response = await customAxios.post<PasswordlessRegisterInfo>('/passwordless/register', {
        email,
        password: options.password,
        signupToken: options.signupToken
    });
    return response.data;
}

// 모바일 QR 등록 완료 확인 (등록 화면에서 주기적으로 호출)
export async function confirmPasswordlessRegister(email: string): Promise<boolean> {
    const response = await customAxios.post<{ registered: boolean }>('/passwordless/register/confirm', {email});
    return response.data.registered;
}

// 로그인 1단계: 인증 시작 (화면에 보여줄 자동패스워드 숫자 발급)
export async function startPasswordlessLogin(email: string): Promise<PasswordlessAuthStart>{
    const response = await customAxios.post<PasswordlessAuthStart>('/passwordless/login/start', {email});
    return response.data;
}

// 로그인 2단계: 승인 결과 폴링
export async function checkPasswordlessLogin(email:string, sessionId: string): Promise<PasswordlessLoginResult> {
    const response = await customAxios.post<PasswordlessLoginResult>('/passwordless/login/result', {email, sessionId})
    return response.data;
}

// 로그인 취소
export async function cancelPasswordlessLogin(email: string, sessionId: string): Promise<void> {
    await customAxios.post('/passwordless/login/cancel', {email, sessionId});
}

// 등록 여부 조회 (로그인 화면에서 패스워드리스 버튼 노출 판단용)
export async function isPasswordlessRegistered(email: string): Promise<boolean> {
    const response = await customAxios.get<{ registered: boolean }>('/passwordless/status', { params: { email } });
    return response.data.registered;
}

// 중개인이 등록 도중 이탈했을 때, 새 signupToken을 이메일로 다시 받는다
export async function resendPasswordlessSignup(email: string): Promise<{ message: string }> {
    const response = await customAxios.post<{ message: string }>('/passwordless/register/resend', {email});
    return response.data;
}

// 재발급 링크 교환: 링크 속 broker_resend 토큰을 실제 signupToken(JWT)으로 바꾼다.
// "QR 코드 발급" 버튼을 누른 순간에만 호출해야 한다.
export async function exchangeResendLink(email: string, linkToken: string): Promise<{ signupToken: string }> {
    const response = await customAxios.post<{ signupToken: string }>('/passwordless/register/resend/exchange', {
        email,
        linkToken,
    });
    return response.data;
}

// 해지 — 비밀번호가 있는 계정은 password로 본인 확인한다.
export async function withdrawPasswordless(email: string, password: string): Promise<void> {
    await customAxios.post('/passwordless/withdrawal', { email, password });
}