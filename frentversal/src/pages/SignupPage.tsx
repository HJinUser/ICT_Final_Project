import axios from "axios";
import customAxios from "../api/axiosInstance.tsx";
import { useState } from "react";
import { Card, Container, Row, Form, Col, Button, Alert } from "react-bootstrap";
import { useNavigate } from "react-router-dom";

function App() {
    // 회원 가입시 필요한 항목들을 state로 정의하기
    // 파라미터 관련 state 변수 선언
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [address, setAddress] = useState('');


    // 폼 유효성 검사(Form Validation Check) 관련 state 정의 : 입력 양식에 문제 발생시 값을 저장할 곳
    // general은 그냥 일반 오류가 있을까봐 적어 놓은 것 (큰 의미 X)
    const [errors, setErrors] = useState({
        name: '', email: '', password: '', address: '', general: ''
    });

    const navigate = useNavigate();

    const SingupAction = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault(); // 이벤트 전파 방지

        try {
            const url = '/member/signup';
            const parameters = { name, email, password, address };
            const config = { withCredentials: true };
            const response = await customAxios.post(url, parameters, config);

            if (response.status === 200) { /* 스프링의 MemberController 파일 참조 */
                alert('회원 가입 성공');
                navigate('/member/login');
            }

        } catch (error) { // error : 예외 객체
            if (axios.isAxiosError(error)) {
                if (error.response?.data) {
                    // 서버에서 받은 오류 정보를 객체로 저장합니다.
                    setErrors(error.response.data);
                }
            } else { // 입력 값 이외에 발생하는 다른 오류과 관련됨
                setErrors((prev) => ({
                    ...prev,
                    general: "회원 가입 중에 오류가 발생하였습니다.",
                }));
            }
        }
    };

    return (
        <Container className="d-flex justify-content-center align-items-center" style={{ height: '70vh' }}>
            <Row className="w-100 justify-content-center">
                <Col md={6}>
                    <Card>
                        <Card.Body>
                            <h2 className="text-center mb-4">회원 가입</h2>

                            {/* 일반 오류 발생시 사용자에게 alert 메시지를 보여 줍니다. */}
                            {/* contextual : 상황에 맞는 적절한 스타일 색상을 지정하는 기법 */}
                            {errors.general && <Alert variant="danger">{errors.general}</Alert>}

                            {/*
                                !! 연산자는 어떠한 값을 강제로 boolean 형태로 변환해주는 자바스크립트 기법입니다.

                                isInvalid 속성은 해당 control의 유효성을 검사하는 속성입니다.
                                값이 true이면 Form.Control.Feedback에 빨간 색상으로 오류 메시지를 보여 줍니다.
                            */}

                            <Form onSubmit={SingupAction}>
                                {/* 이름 */}
                                <Form.Group as={Row} className="mb-3"> {/* as는 자격임 Row의 자격으로써 이 구문을 보겠다. */}
                                    <Form.Label column sm={3}> {/* grid에서 3칸 */}
                                        이름
                                    </Form.Label>

                                    {/* HTML의 input이 JSX에서는 Control*/} {/* grid에서 9칸 */}
                                    <Col sm={9}>
                                        {/* 속성들 적기 */}
                                        {/* value={name} 이 태그의 값과 내가 원하는 변수?와 연결 */}
                                        {/* onChange={(e) => setName(e.target.value)} 이 태그의 값이 바뀌면 연결된 변수도 값이 변함 */}
                                        <Form.Control
                                            type="text"
                                            placeholder="이름을 입력해 주세요."
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            isInvalid={!!errors.name}
                                        />
                                        <Form.Control.Feedback type="invalid">
                                            {errors.name}
                                        </Form.Control.Feedback>
                                    </Col>
                                </Form.Group>

                                {/* 이메일 */}
                                <Form.Group as={Row} className="mb-3">
                                    <Form.Label column sm={3}>
                                        이메일
                                    </Form.Label>
                                    <Col sm={9}>
                                        <Form.Control
                                            type="text"
                                            placeholder="이메일을 입력해 주세요."
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            isInvalid={!!errors.email}
                                        />
                                        <Form.Control.Feedback type="invalid">
                                            {errors.email}
                                        </Form.Control.Feedback>
                                    </Col>
                                </Form.Group>

                                {/* 비밀번호 */}
                                <Form.Group as={Row} className="mb-3">
                                    <Form.Label column sm={3}>
                                        비밀번호
                                    </Form.Label>
                                    <Col sm={9}>
                                        <Form.Control
                                            type="password"
                                            placeholder="비밀 번호를 입력해 주세요."
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            isInvalid={!!errors.password}
                                        />
                                        <Form.Control.Feedback type="invalid">
                                            {errors.password}
                                        </Form.Control.Feedback>
                                    </Col>
                                </Form.Group>

                                {/* 주소 */}
                                <Form.Group as={Row} className="mb-3">
                                    <Form.Label column sm={3}>
                                        주소
                                    </Form.Label>
                                    <Col sm={9}>
                                        <Form.Control
                                            type="text"
                                            placeholder="주소를 입력해 주세요."
                                            value={address}
                                            onChange={(e) => setAddress(e.target.value)}
                                            isInvalid={!!errors.address}
                                        />
                                        <Form.Control.Feedback type="invalid">
                                            {errors.address}
                                        </Form.Control.Feedback>
                                    </Col>
                                </Form.Group>

                                <Button variant="primary" type="submit" className="w-100">
                                    회원 가입
                                </Button>


                            </Form>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container >
    );
};

export default App;
