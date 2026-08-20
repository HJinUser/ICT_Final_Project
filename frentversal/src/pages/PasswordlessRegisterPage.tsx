import "../styles/PasswordlessRegisterPage.css";
import {useLocation, useNavigate, useSearchParams} from "react-router-dom";
import React, {useEffect, useState} from "react";
import {confirmPasswordlessRegister, exchangeResendLink, registerPasswordless, resendPasswordlessSignup} from "../api/passwordlessApi.ts";
import axios from "axios";

interface LocationState {
    email?: string;
    signupToken?: string;
}

const POLL_INTERVAL = 3000;

function PasswordlessRegisterPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const state = (location.state ?? {}) as LocationState;

    // signupToken이 있으면 "중개인 가입 직후" 흐름 — 이메일은 고정, 비밀번호 입력 자체가 없다.
    // (회원가입 직후 navigate state로 오거나, 등록 도중 이탈 후 이메일로 재발급받은 링크의 쿼리스트링으로 올 수도 있다)
    const signupToken = state.signupToken ?? searchParams.get("token") ?? undefined;
    const linkToken = searchParams.get("linkToken") ?? undefined;
    const isBrokerFlow = Boolean(signupToken) || Boolean(linkToken);

    const [email, setEmail] = useState(state.email ?? searchParams.get("email") ?? "");
    const [password, setPassword] = useState("");
    const [exchangedSignupToken, setExchangedSignupToken] = useState<string | undefined>(undefined);
    const [errorMessage, setErrorMessage] = useState("");

    // 등록 링크 재발급(이메일) 관련 상태
    const [resendMessage, setResendMessage] = useState("");
    const [resending, setResending] = useState(false);

    const [qrInfo, setQrInfo] = useState<{ qrDataUrl: string; registerKey: string } | null>(null);
    const [waiting, setWaiting] = useState(false);
    const [registered, setRegistered] = useState(false);

    // QR 발급 후, 모바일에서 등록을 완료했는지 주기적으로 확인한다.
    useEffect(() => {
        if (!waiting) return;

        const timer = window.setInterval(async () => {
            try {
                const ok = await confirmPasswordlessRegister(email);
                if (ok){
                    setRegistered(true);
                    setWaiting(false);
                }
            } catch (error) {
                console.error("등록 완료 확인 실패", error);
            }
        }, POLL_INTERVAL);

        return () => window.clearInterval(timer);
    }, [waiting, email]);

    const handleIssueQr = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setErrorMessage("");

        try {
            let tokenToUse = signupToken ?? exchangedSignupToken;
            if (!tokenToUse && linkToken) {
                const result = await exchangeResendLink(email, linkToken);
                tokenToUse = result.signupToken;
                setExchangedSignupToken(tokenToUse);
            }
            const info = await registerPasswordless(
                email,
                isBrokerFlow ? { signupToken: tokenToUse } : (password ? { password } : {})
            );
            setQrInfo(info);
            setWaiting(true);
        } catch (error) {
            if (axios.isAxiosError(error) && error.response?.data?.message) {
                setErrorMessage(error.response.data.message);
            } else {
                setErrorMessage("QR 코드 발급 중 오류가 발생했습니다.");
            }
        }
    };

    // 등록 도중 이탈한 중개인이 새 등록 링크를 이메일로 다시 받는다.
    const handleResend = async () => {
        setErrorMessage("");
        setResendMessage("");

        if (!email) {
            setErrorMessage("이메일을 입력해 주세요.");
            return;
        }

        setResending(true);
        try {
            const result = await resendPasswordlessSignup(email);
            setResendMessage(result.message);
        } catch (error) {
            if (axios.isAxiosError(error) && error.response?.data?.message) {
                setErrorMessage(error.response.data.message);
            } else {
                setErrorMessage("메일 발송 중 오류가 발생했습니다.");
            }
        } finally {
            setResending(false);
        }
    };

    return (
        <main>
            <section className="page-hero">
                <div className="wrap">
                    <div>
                        <div className="eyebrow">Passwordless</div>
                        <h1>패스워드리스 등록</h1>
                        <p>
                            이메일로 QR을 발급받아 휴대폰으로 등록합니다. 일반 회원가입한
                            중개인은 반드시 등록해야 합니다.
                        </p>
                    </div>
                </div>
            </section>

            <section className="section">
                <div className="wrap" style={{ maxWidth: 560 }}>
                    <div className="surface shadow" style={{ padding: 32 }}>
                        <h2>패스워드리스 기기 등록</h2>

                        {errorMessage && (
                            <div className="passwordless-alert danger">{errorMessage}</div>
                        )}
                        {resendMessage && (
                            <div className="passwordless-alert success">{resendMessage}</div>
                        )}

                        {registered ? (
                            <div className="passwordless-alert success">
                                등록이 완료되었습니다! 이제 로그인 화면에서 패스워드리스로
                                로그인할 수 있습니다.
                            </div>
                        ) : qrInfo ? (
                            <div
                                className="soft passwordless-qr-wrap"
                                style={{ textAlign: "center", marginTop: 18 }}
                            >
                                <img
                                    src={qrInfo.qrDataUrl}
                                    alt="패스워드리스 등록 QR 코드"
                                    className="passwordless-qr"
                                />
                                <p className="xs dim" style={{ marginTop: 12 }}>
                                    휴대폰 카메라로 QR을 촬영해 등록하세요.
                                </p>

                                {waiting && (
                                    <div
                                        className="row gap8"
                                        style={{ justifyContent: "center", marginTop: 10 }}
                                    >
                                        <span className="spinner-sm" />
                                        <span className="xs dim">
                                            모바일 등록을 기다리는 중...
                                        </span>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <form onSubmit={handleIssueQr}>
                                <div className="field">
                                    <label>이메일</label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        readOnly={isBrokerFlow}
                                        required
                                    />
                                </div>

                                {/* 비밀번호가 있는 계정(일반 회원)만 입력받는다. 중개인은 가입 시 받은 토큰으로 대신 확인한다.
                                    (토큰 없이 이 화면에 온 경우 = 등록 도중 이탈한 중개인일 수 있어 비밀번호를 선택 입력으로 둔다) */}
                                {!isBrokerFlow && (
                                    <div className="field">
                                        <label>비밀번호 (선택)</label>
                                        <input
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                        />
                                        <p className="xs dim" style={{ marginTop: 4 }}>
                                            비밀번호 없이 가입한 중개인이라면 비워두고 바로 QR 코드를 발급받으세요.
                                        </p>
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    className="solid-btn"
                                    style={{ width: "100%", marginTop: 18 }}
                                >
                                    QR 코드 발급
                                </button>

                                {/* 중개인이 등록 도중 이탈해서 가입 직후 토큰이 만료된 경우를 위한 재발급 경로 */}
                                {!isBrokerFlow && (
                                    <button
                                        type="button"
                                        className="ghost-btn"
                                        style={{ width: "100%", marginTop: 9 }}
                                        onClick={handleResend}
                                        disabled={resending}
                                    >
                                        {resending ? "발송 중..." : "중개인인데 등록을 중간에 멈췄나요? 이메일로 등록 링크 받기"}
                                    </button>
                                )}
                            </form>
                        )}

                        <button
                            type="button"
                            className="ghost-btn"
                            style={{ width: "100%", marginTop: 9 }}
                            onClick={() => navigate("/member/login")}
                        >
                            로그인으로 돌아가기
                        </button>
                    </div>
                </div>
            </section>
        </main>
    );
}

export default PasswordlessRegisterPage;
