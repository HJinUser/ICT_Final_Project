/*
  "최근에 어떤 방법으로 로그인했는지"를 기억해 두었다가 로그인 화면에서 다시 보여 주기 위한 타입.

  이 값은 로그인 수단을 고르는 데 도움을 주는 편의 정보일 뿐이라 브라우저(localStorage)에만 둔다.
  비밀번호나 토큰은 절대 담지 않는다.
*/

export type RecentLoginMethod = 'NORMAL' | 'PASSWORDLESS' | 'kakao' | 'naver' | 'google';

export type RecentLogin = {
    method: RecentLoginMethod;
    // 마지막으로 로그인할 때 쓴 이메일. 다시 채워 넣는 용도로만 쓴다.
    email: string;
    // 저장 시각 (ISO 문자열). 화면에는 날짜만 잘라서 보여 준다.
    savedAt: string;
};

export const RECENT_LOGIN_LABELS: Record<RecentLoginMethod, string> = {
    NORMAL: '일반 로그인',
    PASSWORDLESS: '패스워드리스 로그인',
    kakao: '카카오 로그인',
    naver: '네이버 로그인',
    google: 'Google 로그인',
};
