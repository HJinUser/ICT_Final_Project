/*
TypeScript 타입 정의
User라는 객체는 반드시 다음 형태이어야 함을 알려 주는 타입(설계도)입니다.

이건 문자열 리터럴 유니온 타입 입니다.
role은 오직 "USER" 또는 "ADMIN"만 가능합니다.
*/
/* 리액트 앱 내부에서 사용하는 사용자 모델 */
// 로그인을 하면 로그인한 사용자 정보는 여기 들어 있음
export interface User {
    id: number;
    name: string;
    email: string;
    role: "USER" | "BROKER" | "ADMIN";
}

/* 서버가 로그인 시 내려주는 응답 */
// LoginResponse는 User를 포함
// 로그인한 사용자에게 토큰을 부여하는 것
export interface LoginResponse extends User {
    accessToken: string;
    refreshToken: string; // [refresh] 서버가 로그인 응답에 함께 담아 내려주는 refresh token. access token 만료 시 재발급에 사용한다.
}
