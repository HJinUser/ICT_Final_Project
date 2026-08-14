import axios from "axios";
import customAxios from "../api/axiosInstance.tsx";
import { useState } from "react";
import { Card, Container, Row, Form, Col, Button, Alert, Tabs, Tab } from "react-bootstrap";
import { useNavigate, useSearchParams } from "react-router-dom";

import TermsAgreement from "./components/TermsAgreement";
import type { AgreementState } from "../types/Terms";
import { TERMS_VERSION, missingRequired } from "../types/Terms";

// 카카오 로그인은 성공했지만 아직 우리 DB에 없는 사람이 오는 페이지.
// OAuth2LoginSuccessHandler가 리다이렉트하면서 URL에 실어 보낸 token(소셜 가입 인증용),
// nickname/email(있으면 미리 채워주는 용도)을 읽어서 폼을 채운다.
// SignupPage.tsx와 거의 같은 구조지만 비밀번호 입력칸이 없다(소셜 가입은 비밀번호 자체가 없음).
function App() {
    const [searchParams] = useSearchParams();
    const socialToken = searchParams.get('token') ?? '';
    const navigate = useNavigate();

    // 토큰이 없으면(직접 주소를 쳐서 들어온 경우 등) 잘못된 접근이라 로그인 페이지로 돌려보낸다.
    if (!socialToken) {
        navigate('/member/login');
    }

    const [signupType, setSignupType] = useState<'USER' | 'BROKER'>('USER');

    const [name, setName] = useState(searchParams.get('nickname') ?? '');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState(searchParams.get('email') ?? '');
    const [address, setAddress] = useState('');

    // 중개인 전용
    const [licenseNumber, setLicenseNumber] = useState('');
    const [agencyName, setAgencyName] = useState('');
    const [agencyAddress, setAgencyAddress] = useState('');
    const [officePhone, setOfficePhone] = useState('');

    // 일반 회원가입과 같은 약관 항목을 받는다(가입 경로만 다를 뿐 동의해야 할 내용은 같다).
    const [agreements, setAgreements] = useState<AgreementState>({});

    const [errors, setErrors] = useState({
        name: '', phone: '', email: '', address: '',
        licenseNumber: '', agencyName: '', agencyAddress: '', officePhone: '',
        agreedTerms: '', general: ''
    });

    const socialSignupAction = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const missing = missingRequired(signupType, agreements);
        if (missing.length > 0) {
            setErrors((prev) => ({
                ...prev,
                agreedTerms: `필수 항목에 동의해 주세요: ${missing.map((doc) => doc.title).join(', ')}`,
            }));
            return;
        }

        try {
            const url = '/member/signup';
            // 일반 회원가입과 같은 엔드포인트를 쓴다. socialToken이 있으면
            // 서버(MemberService.insert)가 소셜 가입으로 처리하고 비밀번호는 요구하지 않는다.
            const parameters = {
                signupType, name, phone, email, address,
                licenseNumber, agencyName, agencyAddress, officePhone,
                socialToken,
                // 약관: 동의한 버전과 선택 항목만 보낸다(필수 항목은 위에서 이미 막았다)
                termsVersion: TERMS_VERSION,
                agreedMarketing: !!agreements.marketing,
                agreedThirdParty: !!agreements.thirdParty,
            };
            const config = { withCredentials: true };
            const response = await customAxios.post(url, parameters, config);

            if (response.status === 200) {
                alert('회원 가입 성공. 해당 소셜로 다시 로그인해 주세요.');
                navigate('/member/login');
            }

        } catch (error) {
            if (axios.isAxiosError(error)) {
                if (error.response?.data) {
                    setErrors(error.response.data);
                }
            } else {
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
                            <h2 className="text-center mb-4">추가 정보 입력</h2>
                            <p className="text-muted text-center mb-4">
                                카카오 로그인이 확인되었습니다. 마지막으로 아래 정보만 입력해 주세요.
                            </p>

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

                            {errors.general && <Alert variant="danger">{errors.general}</Alert>}

                            <Form onSubmit={socialSignupAction}>
                                {/* 이름 */}
                                <Form.Group as={Row} className="mb-3">
                                    <Form.Label column sm={3}>
                                        *이름
                                    </Form.Label>
                                    <Col sm={9}>
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

                                {/* 이메일: 카카오는 안 줘서 직접 입력, 구글 등은 나중에 이 값이 미리 채워짐 */}
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

                                {signupType === 'USER' && (
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
                                )}

                                {signupType === 'BROKER' && (
                                    <>
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

                                <div className="mb-3">
                                    <TermsAgreement
                                        signupType={signupType}
                                        value={agreements}
                                        onChange={setAgreements}
                                        error={errors.agreedTerms}
                                    />
                                </div>

                                <Button variant="primary" type="submit" className="w-100">
                                    회원 가입 완료
                                </Button>
                            </Form>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
};

export default App;
