import axios from "axios";
import customAxios from "../api/axiosInstance.tsx";
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import TermsAgreement from "./components/TermsAgreement";
import type { AgreementState } from "../types/Terms";
import { TERMS_VERSION, missingRequired } from "../types/Terms";
// SignupPage와 "왼쪽 사진 + 오른쪽 입력폼" 골격, 역할 선택 카드, 필드/버튼 스타일을 전부 같이 쓴다.
// 소셜 가입은 일반 가입과 거의 같은 화면이라(비밀번호 칸만 없음) 별도 CSS를 새로 만들지 않고
// SignupPage.css의 auth-* 클래스를 그대로 재사용한다.
import '../styles/SignupPage.css';

// 왼쪽 사진 영역 배경. SignupPage.tsx와 같은 이미지를 쓴다(같은 가입 흐름이라는 인상을 유지하기 위함).
const VISUAL_IMAGE =
    "linear-gradient(160deg,rgba(49,0,90,.94),rgba(75,0,130,.68))," +
    "url('https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1000&q=70')";

// 카카오 로그인은 성공했지만 아직 우리 DB에 없는 사람이 오는 페이지.
// OAuth2LoginSuccessHandler가 리다이렉트하면서 URL에 실어 보낸 token(소셜 가입 인증용),
// nickname/email(있으면 미리 채워주는 용도)을 읽어서 폼을 채운다.
// SignupPage.tsx와 거의 같은 구조지만 비밀번호 입력칸이 없다(소셜 가입은 비밀번호 자체가 없음).
function SocialSignupPage() {
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
        <div className="auth-shell">
            {/*  왼쪽: 사진 + 안내  */}
            <section className="auth-visual" style={{ backgroundImage: VISUAL_IMAGE }}>
                <span className="pill">Almost There</span>
                <h2>마지막 한 단계만<br />더 진행해 주세요</h2>
                <p>소셜 로그인 확인이 끝났습니다. 역할에 맞는 정보만 입력하면 가입이 완료됩니다.</p>

                <div className="points">
                    <div className="point"><i>✓</i> 소셜 로그인 확인 완료</div>
                    <div className="point"><i>U</i> 사용자: 취향 기반 매물 추천</div>
                    <div className="point"><i>B</i> 중개인: 매물 등록과 승인 관리</div>
                </div>
            </section>

            {/*  오른쪽: 입력 폼  */}
            <section className="auth-area">
                <div className="eyebrow">Join</div>
                <h1>추가 정보 입력</h1>
                <p>카카오 로그인이 확인되었습니다. 마지막으로 아래 정보만 입력해 주세요.</p>

                {/* 가입 유형: 일반 사용자 / 중개인. SignupPage와 같은 역할 선택 카드를 그대로 쓴다. */}
                <div className="auth-role-cards">
                    <button
                        type="button"
                        className={`auth-role-card ${signupType === 'USER' ? 'on' : ''}`}
                        onClick={() => setSignupType('USER')}
                    >
                        <strong>사용자</strong>
                        <span>집을 찾고 추천받습니다.</span>
                    </button>
                    <button
                        type="button"
                        className={`auth-role-card ${signupType === 'BROKER' ? 'on' : ''}`}
                        onClick={() => setSignupType('BROKER')}
                    >
                        <strong>중개인</strong>
                        <span>중개사무소와 매물을 관리합니다.</span>
                    </button>
                </div>

                {errors.general && <div className="auth-alert">{errors.general}</div>}

                <form onSubmit={socialSignupAction}>
                    <div className="auth-fields-2">
                        {/* 이름 */}
                        <div className="auth-field">
                            <label htmlFor="social-signup-name">이름</label>
                            <input
                                id="social-signup-name"
                                type="text"
                                placeholder="이름을 입력해 주세요."
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className={errors.name ? 'invalid' : ''}
                                required
                            />
                            {errors.name && <span className="msg">{errors.name}</span>}
                        </div>

                        {/* 전화번호 */}
                        <div className="auth-field">
                            <label htmlFor="social-signup-phone">전화번호</label>
                            <input
                                id="social-signup-phone"
                                type="text"
                                placeholder="010-0000-0000"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                className={errors.phone ? 'invalid' : ''}
                                required
                            />
                            {errors.phone && <span className="msg">{errors.phone}</span>}
                        </div>
                    </div>

                    {/* 이메일: 카카오는 안 줘서 직접 입력, 구글 등은 나중에 이 값이 미리 채워짐 */}
                    <div className="auth-field">
                        <label htmlFor="social-signup-email">이메일</label>
                        <input
                            id="social-signup-email"
                            type="text"
                            placeholder="이메일을 입력해 주세요."
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className={errors.email ? 'invalid' : ''}
                            required
                        />
                        {errors.email && <span className="msg">{errors.email}</span>}
                    </div>

                    {signupType === 'USER' && (
                        <div className="auth-field">
                            <label htmlFor="social-signup-address">주소</label>
                            <input
                                id="social-signup-address"
                                type="text"
                                placeholder="주소를 입력해 주세요."
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                                className={errors.address ? 'invalid' : ''}
                            />
                            {errors.address && <span className="msg">{errors.address}</span>}
                        </div>
                    )}

                    {signupType === 'BROKER' && (
                        <>
                            <div className="auth-field">
                                <label htmlFor="social-signup-license">공인중개사 등록번호</label>
                                <input
                                    id="social-signup-license"
                                    type="text"
                                    placeholder="공인중개사 등록번호를 입력해 주세요."
                                    value={licenseNumber}
                                    onChange={(e) => setLicenseNumber(e.target.value)}
                                    className={errors.licenseNumber ? 'invalid' : ''}
                                    required
                                />
                                {errors.licenseNumber && <span className="msg">{errors.licenseNumber}</span>}
                            </div>

                            <div className="auth-field">
                                <label htmlFor="social-signup-agency-name">중개사무소명</label>
                                <input
                                    id="social-signup-agency-name"
                                    type="text"
                                    placeholder="사무소명 또는 사업자 등록번호를 입력해 주세요."
                                    value={agencyName}
                                    onChange={(e) => setAgencyName(e.target.value)}
                                    className={errors.agencyName ? 'invalid' : ''}
                                    required
                                />
                                {errors.agencyName && <span className="msg">{errors.agencyName}</span>}
                            </div>

                            <div className="auth-field">
                                <label htmlFor="social-signup-agency-address">사무소 주소</label>
                                <input
                                    id="social-signup-agency-address"
                                    type="text"
                                    placeholder="중개사무소 주소를 입력해 주세요."
                                    value={agencyAddress}
                                    onChange={(e) => setAgencyAddress(e.target.value)}
                                    className={errors.agencyAddress ? 'invalid' : ''}
                                    required
                                />
                                {errors.agencyAddress && <span className="msg">{errors.agencyAddress}</span>}
                            </div>

                            <div className="auth-field">
                                <label htmlFor="social-signup-office-phone">사무실 번호</label>
                                <input
                                    id="social-signup-office-phone"
                                    type="text"
                                    placeholder="02-0000-0000"
                                    value={officePhone}
                                    onChange={(e) => setOfficePhone(e.target.value)}
                                    className={errors.officePhone ? 'invalid' : ''}
                                    required
                                />
                                {errors.officePhone && <span className="msg">{errors.officePhone}</span>}
                            </div>
                        </>
                    )}

                    {/* 약관 동의. 항목은 가입 유형에 따라 달라진다(중개인은 사무소 정보 공개가 추가). */}
                    <div style={{ marginTop: 16 }}>
                        <TermsAgreement
                            signupType={signupType}
                            value={agreements}
                            onChange={setAgreements}
                            error={errors.agreedTerms}
                        />
                    </div>

                    <button type="submit" className="auth-solid-btn" style={{ marginTop: 20 }}>
                        회원 가입 완료
                    </button>
                </form>
            </section>
        </div>
    );
}

export default SocialSignupPage;
