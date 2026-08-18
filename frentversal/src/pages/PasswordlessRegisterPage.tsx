import "../styles/PasswordlessRegisterPage.css";
import {useLocation, useNavigate} from "react-router-dom";
import React, {useEffect, useState} from "react";
import {confirmPasswordlessRegister, registerPasswordless} from "../api/passwordlessApi.ts";
import axios from "axios";

interface LocationState {
    email?: string;
    signupToken?: string;
}

const POLL_INTERVAL = 3000;

function PasswordlessRegisterPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const state = (location.state ?? {}) as LocationState;

    // signupToken이 있으면 "중개인 가입 직후" 흐름 — 이메일은 고정, 비밀번호 입력 자체가 없다.
    const isBrokerFlow = Boolean(state.signupToken);

    const [email, setEmail] = useState(state.email ?? "");
    const [password, setPassword] = useState("");
    const [errorMessage, setErrorMessage] = useState("");

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
            const info = await registerPasswordless(
                email,
                isBrokerFlow ? { signupToken: state.signupToken } : { password }
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

                                {/* 비밀번호가 있는 계정(일반 회원)만 입력받는다. 중개인은 가입 시 받은 토큰으로 대신 확인한다. */}
                                {!isBrokerFlow && (
                                    <div className="field">
                                        <label>비밀번호</label>
                                        <input
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                        />
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    className="solid-btn"
                                    style={{ width: "100%", marginTop: 18 }}
                                >
                                    QR 코드 발급
                                </button>
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
