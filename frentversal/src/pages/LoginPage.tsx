import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

import { login } from "../api/authApi";
import { startPasswordlessLogin, checkPasswordlessLogin, cancelPasswordlessLogin } from "../api/passwordlessApi";
import { API_BASE_URL } from "../config/config";
import { SOCIAL_BUTTONS } from "../types/Auth";
import type { PasswordlessLoginResult } from "../types/Auth";
import type { User } from "../types/User";
import "../styles/AuthForm.css";

interface Props {
    // onLogin 프롭스는 User 형식으로 매개 변수를 받고, 반환 타입이 없습니다.
    onLogin: (user: User) => void;
}

// 왼쪽 사진 영역 배경. 서버에서 받아올 값이 아니라 화면 장식이라 상수로 둔다.
const VISUAL_IMAGE =
    "linear-gradient(160deg,rgba(49,0,90,.95),rgba(75,0,130,.72))," +
    "url('https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1000&q=70')";

// 패스워드리스 로그인 결과 폴링 주기(밀리초)
const PWLESS_POLL_INTERVAL = 2000;

function App({ onLogin }: Props) {
    // 로그인과 관련된 state
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    // 탭: 일반 로그인 / 패스워드리스 로그인
    const [mode, setMode] = useState<'normal' | 'passwordless'>('normal');

    // 에러 관련 메시지
    const [errors, setErrors] = useState('');

    const navigate = useNavigate();

    // 패스워드리스 로그인 진행 상태.
    //   idle    : 이메일만 입력하고 시작 전
    //   waiting : 시작 요청을 보내고 휴대폰 승인을 기다리는 중(폴링 중)
    const [pwlessStage, setPwlessStage] = useState<'idle' | 'waiting'>('idle');
    const [pwlessSessionId, setPwlessSessionId] = useState('');
    const [servicePassword, setServicePassword] = useState(''); // 화면에 보여줄 자동패스워드 숫자

    // 로그인 성공 처리(일반 로그인과 동일하게 토큰 저장 + 리다이렉트).
    // 패스워드리스 로그인 성공 응답도 일반 로그인과 같은 모양으로 오기 때문에 그대로 재사용한다.
    const handleLoginSuccess = (userData: User, accessToken: string, refreshToken: string) => {
        localStorage.setItem("accessToken", accessToken);
        localStorage.setItem("refreshToken", refreshToken);
        localStorage.setItem("user", JSON.stringify(userData));

        onLogin(userData);

        // 취향 초기 설정은 일반 사용자(USER)가 아직 완료하지 않았을 때만, 최초 로그인 시 1회 보여준다.
        if (userData.role === "USER" && !userData.preferenceCompleted) {
            navigate("/preference-setup");
        } else {
            navigate("/");
        }
    };

    const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setErrors('');

        try {
            const data = await login({ email, password });

            // 서버의 응답을 전개 연산자로 처리합니다.
            // accessToken는 JWT, userData는 User.ts로 구성된 객체
            const { accessToken, refreshToken, ...userData } = data;
            handleLoginSuccess(userData, accessToken, refreshToken);

        } catch (error) {
            if (axios.isAxiosError(error) && error.response?.data) {
                setErrors(error.response.data.message || "로그인에 실패했습니다.");
            } else {
                setErrors("서버와 통신하는 중 오류가 발생했습니다.");
            }
        }
    };

    // 패스워드리스 로그인 1단계: 인증 시작. 화면에 보여줄 자동패스워드 숫자를 받아온다.
    const startPwlessLogin = async () => {
        setErrors('');
        if (!email) {
            setErrors('이메일을 입력해 주세요.');
            return;
        }

        try {
            const start = await startPasswordlessLogin(email);
            setPwlessSessionId(start.sessionId);
            setServicePassword(start.servicePassword);
            setPwlessStage('waiting');
        } catch (error) {
            if (axios.isAxiosError(error) && error.response?.data?.message) {
                setErrors(error.response.data.message);
            } else {
                setErrors('패스워드리스 로그인을 시작하지 못했습니다.');
            }
        }
    };

    // 패스워드리스 로그인 2단계: 승인 결과 폴링. waiting 상태인 동안 2초마다 반복 호출한다.
    useEffect(() => {
        if (pwlessStage !== 'waiting') return;

        const timer = window.setInterval(async () => {
            try {
                const result: PasswordlessLoginResult = await checkPasswordlessLogin(email, pwlessSessionId);

                if (result.status === 'Y' && result.accessToken && result.refreshToken && result.id != null) {
                    window.clearInterval(timer);
                    setPwlessStage('idle');
                    handleLoginSuccess(
                        {
                            id: result.id,
                            name: result.name ?? '',
                            email: result.email ?? email,
                            role: result.role ?? 'USER',
                            // 지도 검색이 시작 위치와 기본 지역을 정할 때 쓴다
                            address: result.address ?? '',
                            sigungu: result.sigungu ?? '',
                            preferenceCompleted: result.preferenceCompleted ?? false,
                        },
                        result.accessToken,
                        result.refreshToken
                    );
                } else if (result.status === 'N') {
                    window.clearInterval(timer);
                    setPwlessStage('idle');
                    setErrors('로그인이 거절되었습니다.');
                }
                // 'W'(대기)면 아무것도 안 하고 다음 폴링을 기다린다.
            } catch (error) {
                console.error('패스워드리스 로그인 확인 실패', error);
            }
        }, PWLESS_POLL_INTERVAL);

        return () => window.clearInterval(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pwlessStage, email, pwlessSessionId]);

    const cancelPwlessLogin = async () => {
        if (pwlessSessionId) {
            try {
                await cancelPasswordlessLogin(email, pwlessSessionId);
            } catch (error) {
                console.error('패스워드리스 로그인 취소 실패', error);
            }
        }
        setPwlessStage('idle');
        setPwlessSessionId('');
        setServicePassword('');
    };

    return (
        <div className="auth-shell">
            {/* ── 왼쪽: 사진 + 안내 ─────────────────────────── */}
            <section className="auth-visual" style={{ backgroundImage: VISUAL_IMAGE }}>
                <span className="pill">AI 전세 탐색</span>
                <h2>내 기준을 기억하는<br />전세 검색을 시작하세요</h2>
                <p>시세 비교, 맞춤 추천, 가격 하락 알림까지 한 번의 로그인으로 이어집니다.</p>

                <div className="points">
                    <div className="point"><i>1</i> 실거래가 기반 AI 시세예측</div>
                    <div className="point"><i>2</i> 관심매물 가격 변동 알림</div>
                    <div className="point"><i>3</i> 취향에 맞춘 동네·매물 추천</div>
                </div>
            </section>

            {/* ── 오른쪽: 입력 폼 ───────────────────────────── */}
            <section className="auth-area">
                <div className="eyebrow">Account</div>
                <h1>로그인</h1>
                <p>로그인 방식을 선택해 주세요.</p>

                <div className="auth-segmented">
                    <button
                        type="button"
                        className={mode === 'normal' ? 'on' : ''}
                        onClick={() => { setMode('normal'); setErrors(''); }}
                    >
                        일반 로그인
                    </button>
                    <button
                        type="button"
                        className={mode === 'passwordless' ? 'on' : ''}
                        onClick={() => { setMode('passwordless'); setErrors(''); }}
                    >
                        패스워드리스 로그인
                    </button>
                </div>

                {errors && <div className="auth-alert">{errors}</div>}

                {mode === 'normal' ? (
                    <>
                        <form onSubmit={handleLogin}>
                            <div className="auth-field">
                                <label htmlFor="login-email">이메일</label>
                                <input
                                    id="login-email"
                                    type="email"
                                    placeholder="name@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="auth-field">
                                <label htmlFor="login-password">비밀번호</label>
                                <input
                                    id="login-password"
                                    type="password"
                                    placeholder="비밀번호 입력"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>

                            <button type="submit" className="auth-solid-btn" style={{ marginTop: 20 }}>
                                로그인
                            </button>
                        </form>

                        <div className="auth-or">또는 소셜 로그인</div>

                        {/*
                            일반 <a> 태그를 쓴다(react-router의 Link가 아님).
                            이건 SPA 내부 이동이 아니라, 브라우저가 카카오/구글/네이버 로그인 페이지로
                            완전히 떠났다가 돌아와야 하는 흐름이라 실제 페이지 이동이 필요하다.
                            API_BASE_URL(/api)을 거쳐 vite proxy/nginx가 백엔드로 넘겨준다.
                        */}
                        <div className="auth-socials">
                            {SOCIAL_BUTTONS.map((social) => (
                                <a
                                    key={social.provider}
                                    href={`${API_BASE_URL}/oauth2/authorization/${social.provider}`}
                                    className={`auth-social-btn ${social.className}`}
                                >
                                    {social.label}
                                </a>
                            ))}
                        </div>
                    </>
                ) : (
                    // 패스워드리스 로그인: 이메일만 받아서 시작하고, 결과가 나올 때까지 폴링한다.
                    <div className="auth-soft">
                        {pwlessStage === 'idle' ? (
                            <>
                                <div className="auth-field">
                                    <label htmlFor="pwless-email">이메일</label>
                                    <input
                                        id="pwless-email"
                                        type="email"
                                        placeholder="name@example.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                </div>

                                <button
                                    type="button"
                                    className="auth-solid-btn"
                                    style={{ marginTop: 20 }}
                                    onClick={startPwlessLogin}
                                >
                                    패스워드리스로 로그인
                                </button>

                                <p className="auth-foot">
                                    아직 등록하지 않으셨나요?{' '}
                                    <button
                                        type="button"
                                        onClick={() => navigate('/member/passwordless', { state: { email } })}
                                    >
                                        패스워드리스 등록하기
                                    </button>
                                </p>
                            </>
                        ) : (
                            <>
                                <strong>휴대폰에서 아래 숫자를 확인하고 승인해 주세요</strong>
                                <p className="pwless-code">{servicePassword}</p>
                                <p>승인을 기다리는 중입니다...</p>
                                <button type="button" className="auth-solid-btn" onClick={cancelPwlessLogin}>
                                    취소
                                </button>
                            </>
                        )}
                    </div>
                )}

                <p className="auth-foot">
                    아직 계정이 없나요?{' '}
                    <button type="button" onClick={() => navigate('/member/signup')}>회원가입</button>
                </p>
            </section>
        </div>
    );
};

export default App;
