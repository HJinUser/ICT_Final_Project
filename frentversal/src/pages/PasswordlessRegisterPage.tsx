import "../styles/PasswordlessRegisterPage.css";
import {useLocation, useNavigate} from "react-router-dom";
import React, {useEffect, useState} from "react";
import {confirmPasswordlessRegister, registerPasswordless} from "../api/passwordlessApi.ts";
import axios from "axios";
import {Alert, Button, Card, Container, Form, Spinner} from "react-bootstrap";

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
        <Container style={{ maxWidth: 560, marginTop: 40, marginBottom: 60 }}>
            <div className="text-muted small">Passwordless</div>
            <h1>패스워드리스 등록</h1>
            <p className="text-muted">
                이메일로 QR을 발급받아 휴대폰으로 등록합니다. 일반 회원가입한 중개인은 반드시 등록해야 합니다.
            </p>

            <Card className="p-4 mt-3">
                <h2 className="h5">패스워드리스 기기 등록</h2>

                {errorMessage && <Alert variant="danger">{errorMessage}</Alert>}

                {registered ? (
                    <Alert variant="success">
                        등록이 완료되었습니다! 이제 로그인 화면에서 패스워드리스로 로그인할 수 있습니다.
                    </Alert>
                ) : qrInfo ? (
                    <div className="text-center passwordless-qr-wrap">
                        <img src={qrInfo.qrDataUrl} alt="패스워드리스 등록 QR 코드" className="passwordless-qr" />
                        <p className="text-muted small mt-2">휴대폰 카메라로 QR을 촬영해 등록하세요.</p>
                        {waiting && (
                            <div className="d-flex justify-content-center align-items-center gap-2 mt-2">
                                <Spinner animation="border" size="sm" />
                                <span className="text-muted small">모바일 등록을 기다리는 중...</span>
                            </div>
                        )}
                    </div>
                ) : (
                    <Form onSubmit={handleIssueQr}>
                        <Form.Group className="mb-3">
                            <Form.Label>이메일</Form.Label>
                            <Form.Control
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                readOnly={isBrokerFlow}
                                required
                            />
                        </Form.Group>

                        {/* 비밀번호가 있는 계정(일반 회원)만 입력받는다. 중개인은 가입 시 받은 토큰으로 대신 확인한다. */}
                        {!isBrokerFlow && (
                            <Form.Group className="mb-3">
                                <Form.Label>비밀번호</Form.Label>
                                <Form.Control
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </Form.Group>
                        )}

                        <Button type="submit" variant="primary" className="w-100">QR 코드 발급</Button>
                    </Form>
                )}

                <Button variant="outline-secondary" className="w-100 mt-2" onClick={() => navigate("/member/login")}>
                    로그인으로 돌아가기
                </Button>
            </Card>
        </Container>
    );
}

export default PasswordlessRegisterPage;