import { useState } from "react";
import { Alert, Button, Card, Col, Container, Row } from "react-bootstrap";
import { useNavigate } from "react-router-dom";

import customAxios from "../api/axiosInstance.tsx";

// 취향 초기 설정 화면. 지금은 자리만 잡아둔 상태(실제 키워드 선택·매물 평가 UI는 아직 없음)이고,
// "메인으로 가기" 버튼 하나만 있다.
//
// 이 버튼을 누르면 서버에 취향 설정을 완료 처리한다(PATCH /member/preference/complete).
// 이렇게 해야 일반 사용자가 다음 로그인부터 이 화면을 다시 보지 않는다(preferenceCompleted=true).
// 나중에 실제 취향 설정 UI가 들어오면, 지금 이 "완료 처리" 호출을 그 흐름의 마지막 단계로 옮기면 된다.
function App() {
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const goToMain = async () => {
        try {
            await customAxios.patch('/member/preference/complete');
            navigate('/');
        } catch (err) {
            console.error('취향 설정 완료 처리 중 오류가 발생했습니다.', err);
            setError('처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
        }
    };

    return (
        <Container className="d-flex justify-content-center align-items-center" style={{ height: "70vh" }}>
            <Row className="w-100 justify-content-center">
                <Col md={6} sm={10} className="text-center">
                    <Card>
                        <Card.Body>
                            <h2 className="mb-3">취향 초기 설정</h2>
                            <p className="text-muted mb-4">
                                취향 초기 설정 기능은 아직 준비 중입니다.<br />
                                지금은 메인 화면으로 이동해 주세요.
                            </p>

                            {error && <Alert variant="danger">{error}</Alert>}

                            <Button variant="primary" onClick={goToMain} className="w-100">
                                메인으로 가기
                            </Button>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
};

export default App;
