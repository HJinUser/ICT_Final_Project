import axios from "axios";
import customAxios from "../api/axiosInstance.tsx";
import { useState } from "react";
import { Card, Container, Row, Form, Col, Button, Alert, Tabs, Tab } from "react-bootstrap";
import { useNavigate } from "react-router-dom";

function App() {
    // 회원 가입시 필요한 항목들을 state로 정의하기
    // 파라미터 관련 state 변수 선언

    // 탭으로 고르는 가입 종류. role은 서버가 정하고, 프론트는 이 값만 넘긴다.
    const [signupType, setSignupType] = useState<'USER' | 'BROKER'>('USER');

    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');

    // 일반 사용자 전용 (중개인은 비밀번호 없이 가입하고 이후 패스워드리스만 사용한다)
    const [password, setPassword] = useState('');
    // 비밀번호 확인은 서버에 안 보내고 프론트에서만 password와 일치하는지 비교한다.
    const [passwordConfirm, setPasswordConfirm] = useState('');
    const [address, setAddress] = useState('');

    // 중개인 전용
    const [licenseNumber, setLicenseNumber] = useState('');
    const [agencyName, setAgencyName] = useState('');
    const [agencyAddress, setAgencyAddress] = useState('');
    const [officePhone, setOfficePhone] = useState('');

    // 약관 동의 여부. 약관 상세 내용은 아직 확정 전이라 체크박스만 우선 추가한다.
    const [agreedTerms, setAgreedTerms] = useState(false);


    // 폼 유효성 검사(Form Validation Check) 관련 state 정의 : 입력 양식에 문제 발생시 값을 저장할 곳
    // general은 그냥 일반 오류가 있을까봐 적어 놓은 것 (큰 의미 X)
    const [errors, setErrors] = useState({
        name: '', phone: '', email: '', password: '', passwordConfirm: '', address: '',
        licenseNumber: '', agencyName: '', agencyAddress: '', officePhone: '',
        agreedTerms: '', general: ''
    });

    const navigate = useNavigate();

    const SingupAction = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault(); // 이벤트 전파 방지

        // 비밀번호 확인은 일반 사용자만 해당한다. 중개인은 비밀번호 필드 자체가 없다.
        if (signupType === 'USER' && password !== passwordConfirm) {
            setErrors((prev) => ({
                ...prev,
                passwordConfirm: '비밀번호가 일치하지 않습니다.',
            }));
            return;
        }

        // 약관 동의는 서버에 보내기 전에 프론트에서 먼저 막는다. (약관 상세 내용/저장 여부는 미정)
        if (!agreedTerms) {
            setErrors((prev) => ({
                ...prev,
                agreedTerms: '약관에 동의해야 회원가입을 진행할 수 있습니다.',
            }));
            return;
        }

        try {
            const url = '/member/signup';
            // 두 가입 유형의 필드를 한 번에 보낸다. 서버(MemberService.insert)가 signupType을 보고
            // 필요한 값만 사용하므로, 안 쓰는 값(예: 일반 가입의 licenseNumber)은 그냥 무시된다.
            const parameters = {
                signupType, name, phone, email, address,
                password,
                licenseNumber, agencyName, agencyAddress, officePhone,
            };
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

                            {/* 가입 유형 탭: 일반 사용자 / 중개인. eventKey를 signupType state와 그대로 연결한다. */}
                            <Tabs
                                activeKey={signupType}
                                onSelect={(key) => {
                                    if (key === 'USER' || key === 'BROKER') {
                                        setSignupType(key);
                                    }
                                }}
                                className="mb-4"
                                justify
                            >
                                <Tab eventKey="USER" title="일반 사용자" />
                                <Tab eventKey="BROKER" title="중개인" />
                            </Tabs>

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
                                        *이름
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

                                {/* 전화번호 */}
                                <Form.Group as={Row} className="mb-3">
                                    <Form.Label column sm={3}>
                                        *전화번호
                                    </Form.Label>
                                    <Col sm={9}>
                                        <Form.Control
                                            type="text"
                                            placeholder="010-0000-0000"
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value)}
                                            isInvalid={!!errors.phone}
                                        />
                                        <Form.Control.Feedback type="invalid">
                                            {errors.phone}
                                        </Form.Control.Feedback>
                                    </Col>
                                </Form.Group>

                                {/* 이메일 */}
                                <Form.Group as={Row} className="mb-3">
                                    <Form.Label column sm={3}>
                                        *이메일
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

                                {/* 일반 사용자 전용 필드: 중개인은 비밀번호 없이 가입하고 이후 패스워드리스만 사용한다 */}
                                {signupType === 'USER' && (
                                    <>
                                        {/* 비밀번호 */}
                                        <Form.Group as={Row} className="mb-3">
                                            <Form.Label column sm={3}>
                                                *비밀번호
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

                                        {/* 비밀번호 확인 */}
                                        <Form.Group as={Row} className="mb-3">
                                            <Form.Label column sm={3}>
                                                *비밀번호 확인
                                            </Form.Label>
                                            <Col sm={9}>
                                                <Form.Control
                                                    type="password"
                                                    placeholder="비밀 번호를 다시 입력해 주세요."
                                                    value={passwordConfirm}
                                                    onChange={(e) => setPasswordConfirm(e.target.value)}
                                                    isInvalid={!!errors.passwordConfirm}
                                                />
                                                <Form.Control.Feedback type="invalid">
                                                    {errors.passwordConfirm}
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
                                    </>
                                )}

                                {/* 중개인 전용 필드 */}
                                {signupType === 'BROKER' && (
                                    <>
                                        {/* 공인중개사 등록번호 */}
                                        <Form.Group as={Row} className="mb-3">
                                            <Form.Label column sm={3}>
                                                *등록번호
                                            </Form.Label>
                                            <Col sm={9}>
                                                <Form.Control
                                                    type="text"
                                                    placeholder="공인중개사 등록번호를 입력해 주세요."
                                                    value={licenseNumber}
                                                    onChange={(e) => setLicenseNumber(e.target.value)}
                                                    isInvalid={!!errors.licenseNumber}
                                                />
                                                <Form.Control.Feedback type="invalid">
                                                    {errors.licenseNumber}
                                                </Form.Control.Feedback>
                                            </Col>
                                        </Form.Group>

                                        {/* 중개사무소명 */}
                                        <Form.Group as={Row} className="mb-3">
                                            <Form.Label column sm={3}>
                                                *중개사무소명
                                            </Form.Label>
                                            <Col sm={9}>
                                                <Form.Control
                                                    type="text"
                                                    placeholder="사무소명 또는 사업자 등록번호를 입력해 주세요."
                                                    value={agencyName}
                                                    onChange={(e) => setAgencyName(e.target.value)}
                                                    isInvalid={!!errors.agencyName}
                                                />
                                                <Form.Control.Feedback type="invalid">
                                                    {errors.agencyName}
                                                </Form.Control.Feedback>
                                            </Col>
                                        </Form.Group>

                                        {/* 중개사무소 주소 */}
                                        <Form.Group as={Row} className="mb-3">
                                            <Form.Label column sm={3}>
                                                *사무소 주소
                                            </Form.Label>
                                            <Col sm={9}>
                                                <Form.Control
                                                    type="text"
                                                    placeholder="중개사무소 주소를 입력해 주세요."
                                                    value={agencyAddress}
                                                    onChange={(e) => setAgencyAddress(e.target.value)}
                                                    isInvalid={!!errors.agencyAddress}
                                                />
                                                <Form.Control.Feedback type="invalid">
                                                    {errors.agencyAddress}
                                                </Form.Control.Feedback>
                                            </Col>
                                        </Form.Group>

                                        {/* 사무실 번호 */}
                                        <Form.Group as={Row} className="mb-3">
                                            <Form.Label column sm={3}>
                                                *사무실 번호
                                            </Form.Label>
                                            <Col sm={9}>
                                                <Form.Control
                                                    type="text"
                                                    placeholder="02-0000-0000"
                                                    value={officePhone}
                                                    onChange={(e) => setOfficePhone(e.target.value)}
                                                    isInvalid={!!errors.officePhone}
                                                />
                                                <Form.Control.Feedback type="invalid">
                                                    {errors.officePhone}
                                                </Form.Control.Feedback>
                                            </Col>
                                        </Form.Group>
                                    </>
                                )}

                                {/* 약관 동의 : 약관 상세 내용은 아직 미정이라 체크박스만 우선 추가한다 */}
                                <Form.Group className="mb-3">
                                    <Form.Check
                                        type="checkbox"
                                        label="이용약관에 동의합니다. (약관 내용 준비 중)"
                                        checked={agreedTerms}
                                        onChange={(e) => setAgreedTerms(e.target.checked)}
                                        isInvalid={!!errors.agreedTerms}
                                        feedback={errors.agreedTerms}
                                        feedbackType="invalid"
                                    />
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
