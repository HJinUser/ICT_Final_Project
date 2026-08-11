import { useEffect, useState } from "react";
import axios from "axios";
import { Alert, Button, Card, Col, Container, Form, Row } from "react-bootstrap";
import { Link } from "react-router-dom";

import customAxios from "../api/axiosInstance.tsx";
import type { FindEmailVerifyResponse } from "../types/FindEmail";

// 재전송 버튼을 다시 누를 수 있을 때까지 기다리는 시간(초). 서버(PhoneVerificationService)의
// 30초 쿨다운과 맞춰 둔다 - 어차피 서버가 최종적으로 막지만, 어차피 실패할 요청을 미리 막아 둔다.
const RESEND_COOLDOWN_SECONDS = 30;

// 이메일 찾기: 1) 이름+전화번호로 본인 확인 후 인증번호 문자 발송 -> 2) 인증번호 확인 -> 3) 가려진 이메일 표시.
// 이 프로젝트는 로그인 아이디가 곧 이메일이라 "아이디 찾기"는 따로 없고 이 화면 하나로 끝난다.
function App() {
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [code, setCode] = useState('');

    // 인증번호 입력 단계는 인증번호를 보낸 뒤에만 보여준다.
    const [codeSent, setCodeSent] = useState(false);
    const [foundEmail, setFoundEmail] = useState<string | null>(null);

    const [resendCooldown, setResendCooldown] = useState(0);

    const [errors, setErrors] = useState({ name: '', phone: '', code: '', general: '' });

    // 1초마다 재전송 대기 시간을 줄인다. 0이 되면 다시 보낼 수 있다.
    useEffect(() => {
        if (resendCooldown <= 0) {
            return;
        }
        const timer = setInterval(() => {
            setResendCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
        }, 1000);
        return () => clearInterval(timer);
    }, [resendCooldown]);

    const requestCode = async () => {
        setErrors({ name: '', phone: '', code: '', general: '' });

        try {
            const url = '/member/find-email/send-code';
            const response = await customAxios.post(url, { name, phone });

            if (response.status === 200) {
                setCodeSent(true);
                setResendCooldown(RESEND_COOLDOWN_SECONDS);
            }
        } catch (error) {
            if (axios.isAxiosError(error) && error.response?.data) {
                setErrors((prev) => ({ ...prev, ...error.response!.data }));
            } else {
                setErrors((prev) => ({ ...prev, general: '인증번호 전송 중 오류가 발생했습니다.' }));
            }
        }
    };

    const handleSendCode = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        requestCode();
    };

    const handleVerifyCode = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setErrors({ name: '', phone: '', code: '', general: '' });

        try {
            const url = '/member/find-email/verify';
            const response = await customAxios.post<FindEmailVerifyResponse>(url, { phone, code });

            setFoundEmail(response.data.email);
        } catch (error) {
            if (axios.isAxiosError(error) && error.response?.data) {
                setErrors((prev) => ({ ...prev, ...error.response!.data }));
            } else {
                setErrors((prev) => ({ ...prev, general: '인증번호 확인 중 오류가 발생했습니다.' }));
            }
        }
    };

    return (
        <Container className="d-flex justify-content-center align-items-center" style={{ height: "70vh" }}>
            <Row className="w-100 justify-content-center">
                <Col md={6} sm={10}>
                    <Card>
                        <Card.Body>
                            <h2 className="text-center mb-4">이메일 찾기</h2>

                            {errors.general && <Alert variant="danger">{errors.general}</Alert>}

                            {foundEmail ? (
                                <div className="text-center">
                                    <p className="mb-1 text-muted">가입하신 이메일은 아래와 같습니다.</p>
                                    <p className="fs-4 fw-bold mb-4">{foundEmail}</p>
                                    <Link to="/member/login" className="btn btn-primary w-100">
                                        로그인하러 가기
                                    </Link>
                                </div>
                            ) : !codeSent ? (
                                <Form onSubmit={handleSendCode}>
                                    <Form.Group as={Row} className="mb-3">
                                        <Form.Label column sm={3}>
                                            이름
                                        </Form.Label>
                                        <Col sm={9}>
                                            <Form.Control
                                                type="text"
                                                placeholder="이름을 입력해 주세요."
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                isInvalid={!!errors.name}
                                                required
                                            />
                                            <Form.Control.Feedback type="invalid">
                                                {errors.name}
                                            </Form.Control.Feedback>
                                        </Col>
                                    </Form.Group>

                                    <Form.Group as={Row} className="mb-3">
                                        <Form.Label column sm={3}>
                                            전화번호
                                        </Form.Label>
                                        <Col sm={9}>
                                            <Form.Control
                                                type="text"
                                                placeholder="010-0000-0000"
                                                value={phone}
                                                onChange={(e) => setPhone(e.target.value)}
                                                isInvalid={!!errors.phone}
                                                required
                                            />
                                            <Form.Control.Feedback type="invalid">
                                                {errors.phone}
                                            </Form.Control.Feedback>
                                        </Col>
                                    </Form.Group>

                                    <Button variant="primary" type="submit" className="w-100">
                                        인증번호 전송
                                    </Button>
                                </Form>
                            ) : (
                                <Form onSubmit={handleVerifyCode}>
                                    <p className="text-muted small mb-3">
                                        {phone}로 인증번호를 보냈습니다. 5분 이내에 입력해 주세요.
                                    </p>

                                    <Form.Group as={Row} className="mb-3">
                                        <Form.Label column sm={3}>
                                            인증번호
                                        </Form.Label>
                                        <Col sm={9}>
                                            <Form.Control
                                                type="text"
                                                placeholder="6자리 인증번호"
                                                value={code}
                                                onChange={(e) => setCode(e.target.value)}
                                                isInvalid={!!errors.code}
                                                required
                                            />
                                            <Form.Control.Feedback type="invalid">
                                                {errors.code}
                                            </Form.Control.Feedback>
                                        </Col>
                                    </Form.Group>

                                    <Row className="g-2">
                                        <Col xs={7}>
                                            <Button variant="primary" type="submit" className="w-100">
                                                확인
                                            </Button>
                                        </Col>
                                        <Col xs={5}>
                                            <Button
                                                variant="outline-secondary"
                                                className="w-100"
                                                disabled={resendCooldown > 0}
                                                onClick={requestCode}
                                            >
                                                {resendCooldown > 0 ? `재전송 (${resendCooldown}초)` : '재전송'}
                                            </Button>
                                        </Col>
                                    </Row>
                                </Form>
                            )}

                            <p className="text-center small mt-4 mb-0">
                                <Link to="/member/login">로그인으로 돌아가기</Link>
                            </p>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
};

export default App;
