/*
  로그인·회원가입에서 서버와 주고받는 값의 타입.

  기존에는 이 값들이 LoginPage/SignupPage 안에 흩어져 있었는데,
  같은 모양을 소셜 회원가입(SocialSignupPage)에서도 쓰기 때문에 한곳으로 모았다.
  백엔드 SignupDto / LoginDto 와 1:1로 맞춰 두었으므로, 서버 필드가 바뀌면 여기도 같이 바꾼다.
*/

// 가입 유형. 서버는 이 값만 보고 role(USER/BROKER)을 정한다.
// 클라이언트가 role을 직접 보내지 못하게 하려는 것이라 이름이 role이 아니라 signupType이다.
export type SignupType = 'USER' | 'BROKER';

// POST /member/login 요청
export type LoginRequest = {
    email: string;
    password: string;
};

// POST /member/signup 요청.
// 일반 사용자와 중개인 요청을 하나로 합친 형태이고, 서버가 signupType을 보고 필요한 값만 쓴다.
export type SignupRequest = {
    signupType: SignupType;
    name: string;
    phone: string;
    email: string;

    // 일반 사용자 전용 (중개인은 비밀번호 없이 가입하고 이후 패스워드리스/소셜로 로그인한다)
    password?: string;
    address?: string;

    // 중개인 전용
    licenseNumber?: string;
    agencyName?: string;
    agencyAddress?: string;
    officePhone?: string;

    // 소셜 회원가입 전용. OAuth2LoginSuccessHandler가 발급한 단기 토큰이며,
    // 값이 있으면 서버가 소셜 가입으로 처리한다.
    socialToken?: string;
};

// 서버가 입력값 오류를 돌려줄 때의 형태.
// 필드 이름을 키로, 안내 문구를 값으로 준다. 특정 필드에 속하지 않는 오류는 general로 온다.
export type FieldErrors = Partial<Record<keyof SignupRequest | 'passwordConfirm' | 'agreedTerms' | 'general', string>>;

// 소셜 로그인 제공자. /oauth2/authorization/{provider} 경로에 그대로 들어간다.
export type SocialProvider = 'kakao' | 'google' | 'naver';

export type SocialButton = {
    provider: SocialProvider;
    label: string;
    // AuthForm.css의 .auth-social-btn 뒤에 붙는 색상 클래스
    className: string;
};

// 로그인·회원가입 화면에서 공통으로 쓰는 소셜 버튼 목록
export const SOCIAL_BUTTONS: SocialButton[] = [
    { provider: 'kakao', label: '카카오로 계속하기', className: 'kakao' },
    { provider: 'naver', label: '네이버로 계속하기', className: 'naver' },
    { provider: 'google', label: 'Google로 계속하기', className: '' },
];

// ── 패스워드리스 ──────────────────────────────────────────────

// 등록(QR) 요청 응답
export type PasswordlessRegisterInfo = {
    qrDataUrl: string;
    serverUrl: string;
    registerKey: string;
};

// 로그인 1단계(인증 시작) 응답
export type PasswordlessAuthStart = {
    sessionId: string;
    servicePassword: string;
    term: number;
};

// 로그인 2단계(폴링) 응답
export type PasswordlessLoginResult = {
    status: "W" | "Y" | "N";
    accessToken?: string;
    refreshToken?: string;
    id?: number;
    name?: string;
    email?: string;
    role?: "USER" | "BROKER" | "ADMIN";
    preferenceCompleted?: boolean;
};