// 로그인·회원가입 API 호출을 모아 둔 파일.
// 화면(LoginPage/SignupPage)은 이 파일의 함수만 호출하므로, 서버 주소나 응답 구조가 바뀌어도
// 이 파일만 고치면 되고 화면 코드는 그대로 둘 수 있다. (agencyApi.ts 등과 같은 구조)

import customAxios from './axiosInstance';
import type { LoginRequest, SignupRequest } from '../types/Auth';
import type { LoginResponse } from '../types/User';

// 로그인. 성공하면 accessToken/refreshToken과 사용자 정보를 함께 받는다.
export async function login(request: LoginRequest): Promise<LoginResponse> {
    const response = await customAxios.post<LoginResponse>('/member/login', request);
    return response.data;
}

// 회원가입. 일반/중개인/소셜 가입을 이 함수 하나로 처리한다(서버가 signupType과 socialToken을 보고 분기).
export async function signup(request: SignupRequest): Promise<{ passwordlessSignupToken?: string }> {
    const response = await customAxios.post('/member/signup', request);
    return response.data;
}
