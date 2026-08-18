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
    // 서버(Member.constant.Role)가 내려주는 값과 똑같이 맞춰야 한다.
    // 중개인은 "AGENT" 가 아니라 "BROKER" 다. (회원가입 화면도 BROKER 로 보내고 있다)
    role: "USER" | "BROKER" | "ADMIN";

    // 회원가입 때 적은 주소와 거기서 뽑아 둔 구.
    //   address : "서울시 영등포구 당산로 222" — 지도 시작 위치를 이 주소로 맞춘다
    //   sigungu : "영등포구"                  — 지도 검색의 기본 지역 필터로 쓴다
    // 주소를 입력하지 않았거나 예전에 가입한 회원은 비어 있다.
    address?: string;
    sigungu?: string;
    // 취향 초기 설정(온보딩) 완료 여부. 일반 사용자(USER)가 최초 로그인이면 false로 내려온다.
    // 로그인 성공 직후에만 리다이렉트 판단용으로 쓰고, 그 뒤로는 참조하지 않는다.
    preferenceCompleted: boolean;
}

/* 서버가 로그인 시 내려주는 응답 */
// LoginResponse는 User를 포함
// 로그인한 사용자에게 토큰을 부여하는 것
export interface LoginResponse extends User {
    accessToken: string;
    refreshToken: string; // [refresh] 서버가 로그인 응답에 함께 담아 내려주는 refresh token. access token 만료 시 재발급에 사용한다.
}
