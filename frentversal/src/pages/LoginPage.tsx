import { useState } from "react";
import { Alert, Button, Card, Col, Container, Form, Row } from "react-bootstrap";
import { Link, useNavigate } from "react-router-dom";

import customAxios from "../api/axiosInstance.tsx";
import type { LoginResponse, User } from "../types/User";

interface Props {
    // onLogin 프롭스는 User 형식으로 매개 변수를 받고, 반환 타입이 없습니다.
    onLogin: (user: User) => void;
}

function App({ onLogin }: Props) {
    // 이 문서내에서 바뀔 소지가 있는 것들은 state로 만들어 관리 할 수 있음
    // props는 부모에게서! 받은거고 / state는 자신의 문서 내에서! 있는 것들이고
    // 로그인과 관련된 state
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    // 에러 관련 메시지
    const [errors, setErrors] = useState('');

    const navigate = useNavigate();

    const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        console.log('로그인 시도중입니다.');

        try {
            const url = '/member/login';
            const params = { email, password }; // 파라미터
            const config = {
                headers: {
                    "Content-Type": "application/json"
                }
            };

            const response = await customAxios.post<LoginResponse>(url, params, config);

            console.log('응답 데이터 : \n' + response.data);

            // 서버의 응답을 전개 연산자로 처리합니다.
            // accessToken는 JWT, userData는 User.ts으로 구성된 객체
            // refreshToken 도 구조분해로 함께 꺼낸다(응답 본문에 accessToken 과 나란히 들어 있음)
            const { accessToken, refreshToken, ...userData } = response.data;

            localStorage.setItem("accessToken", accessToken);
            // 서버가 함께 내려준 refresh token 을 localStorage 에 저장한다.
            // 이후 access token 이 만료되면 axiosInstance 가 이 값으로 새 access token 을 재발급받는다.
            localStorage.setItem("refreshToken", refreshToken); // refresh token 저장

            console.log('로그인 성공 사용자 : ' + userData);


            if (onLogin) {
                onLogin(userData);

                // userData는 자바스크립트 객체여서 문자열로 바꿔줘야 함
                // JSON.stringify 함수는 JavaScript 객체를 JSON 문자열로 변환해 줍니다.
                localStorage.setItem("user", JSON.stringify(userData));
            }

            navigate("/");

        } catch (error: any) {
            if (error.response) {
                setErrors(error.response.data.message || "로그인 실패");
            } else {
                setErrors("Server Error");
            }
        }
    };


    return (
        <Container fluid className="d-flex justify-content-center align-items-center" style={{ height: "70vh" }}>
            <Row className="w-100 justify-content-center">
                <Col md={6} sm={10}>
                    <Card>
                        <Card.Body>
                            <h2 className="text-center mb-4">로그인</h2>

                            {errors && <Alert variant="danger">{errors}</Alert>}

                            <Form onSubmit={handleLogin}>
                                <Form.Group as={Row} className="mb-3 align-items-center">
                                    <Form.Label column sm={3} className="text-end fw-bold text-primary">
                                        이메일
                                    </Form.Label>
                                    <Col sm={9}>
                                        <Form.Control
                                            type="email"
                                            placeholder="이메일을 입력해 주세요."
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                        />
                                    </Col>
                                </Form.Group>

                                <Form.Group as={Row} className="mb-3 align-items-center">
                                    <Form.Label column sm={3} className="text-end fw-bold text-primary">
                                        비밀 번호
                                    </Form.Label>
                                    <Col sm={9}>
                                        <Form.Control
                                            type="password"
                                            placeholder="비밀 번호을 입력해 주세요."
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                        />
                                    </Col>
                                </Form.Group>

                                <Row className="g-2">
                                    <Col xs={8}>
                                        <Button variant="primary" type="submit" className="w-100">
                                            로그인
                                        </Button>
                                    </Col>
                                    <Col xs={4}>
                                        <Link to="/member/signup" className="btn btn-outline-secondary w-100">
                                            회원 가입
                                        </Link>
                                    </Col>
                                </Row>
                            </Form>

                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
};

export default App;
