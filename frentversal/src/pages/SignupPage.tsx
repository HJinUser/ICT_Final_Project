import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

import { signup } from "../api/authApi";
import AddressInput from "../components/AddressInput";
import TermsAgreement from "../components/TermsAgreement";
import { API_BASE_URL } from "../config/config";
import { SOCIAL_BUTTONS } from "../types/Auth";
import type { FieldErrors, SignupType } from "../types/Auth";
import type { AgreementState } from "../types/Terms";
import { TERMS_VERSION, missingRequired } from "../types/Terms";
import "../styles/AuthForm.css";

// 왼쪽 사진 영역 배경. 서버에서 받아올 값이 아니라 화면 장식이라 상수로 둔다.
const VISUAL_IMAGE =
    "linear-gradient(160deg,rgba(49,0,90,.94),rgba(75,0,130,.68))," +
    "url('https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1000&q=70')";

function App() {
    // 탭으로 고르는 가입 종류. role은 서버가 정하고, 프론트는 이 값만 넘긴다.
    const [signupType, setSignupType] = useState<SignupType>('USER');

    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');

    // 일반 사용자 전용 (중개인은 비밀번호 없이 가입하고 이후 패스워드리스만 사용한다)
    const [password, setPassword] = useState('');
    // 비밀번호 확인은 서버에 안 보내고 프론트에서만 password와 일치하는지 비교한다.
    const [passwordConfirm, setPasswordConfirm] = useState('');
    const [address, setAddress] = useState('');
    // 주소 검색이 함께 준 지역 조각. 지도 검색의 기본 지역을 정할 때 서버가 쓴다.
    const [sigungu, setSigungu] = useState('');
    const [dong, setDong] = useState('');

    // 중개인 전용
    const [licenseNumber, setLicenseNumber] = useState('');
    const [agencyName, setAgencyName] = useState('');
    const [agencyAddress, setAgencyAddress] = useState('');
    // 사무소 상세주소(동·호수). 주소를 한 덩어리로 저장하므로 제출할 때 뒤에 합쳐 보낸다.
    const [agencyAddressDetail, setAgencyAddressDetail] = useState('');
    const [agencySigungu, setAgencySigungu] = useState('');
    const [agencyDong, setAgencyDong] = useState('');
    const [officePhone, setOfficePhone] = useState('');

    // 약관 동의 여부. 항목 구성은 types/Terms.ts가 갖고 있고 여기서는 체크 결과만 보관한다.
    // 가입 유형(사용자/중개인)에 따라 보이는 항목이 달라지므로 코드별 true/false로 둔다.
    const [agreements, setAgreements] = useState<AgreementState>({});

    // 입력 양식에 문제가 생기면 필드 이름을 키로 오류 문구를 담는다.
    const [errors, setErrors] = useState<FieldErrors>({});

    const navigate = useNavigate();

    const signupAction = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setErrors({});

        // 비밀번호 확인은 일반 사용자만 해당한다. 중개인은 비밀번호 필드 자체가 없다.
        if (signupType === 'USER' && password !== passwordConfirm) {
            setErrors({ passwordConfirm: '비밀번호가 일치하지 않습니다.' });
            return;
        }

        // 필수 약관은 서버에 보내기 전에 프론트에서 먼저 막는다.
        // 어떤 항목이 필수인지는 가입 유형마다 다르므로 Terms.ts의 판단을 그대로 쓴다.
        const missing = missingRequired(signupType, agreements);
        if (missing.length > 0) {
            setErrors({
                agreedTerms: `필수 항목에 동의해 주세요: ${missing.map((doc) => doc.title).join(', ')}`,
            });
            return;
        }

        try {
            // 두 가입 유형의 필드를 한 번에 보낸다. 서버(MemberService.insert)가 signupType을 보고
            // 필요한 값만 사용하므로, 안 쓰는 값(예: 일반 가입의 licenseNumber)은 그냥 무시된다.
            const result = await signup({
                signupType, name, phone, email,
                password, address, sigungu, dong,
                licenseNumber, agencyName, officePhone,
                agencySigungu, agencyDong,
                // 상세주소는 따로 저장할 칸이 없어서 도로명 주소 뒤에 붙여 보낸다
                agencyAddress: [agencyAddress, agencyAddressDetail].filter(Boolean).join(' '),
                // 약관: 동의한 버전과 선택 항목만 보낸다(필수 항목은 위에서 이미 막았다)
                termsVersion: TERMS_VERSION,
                agreedMarketing: !!agreements.marketing,
                agreedThirdParty: !!agreements.thirdParty,
            });

            if (signupType === 'BROKER' && result.passwordlessSignupToken) {
                // 중개인은 비밀번호 없이 가입해서 패스워드리스 등록이 로그인의 유일한 방법이다.
                // 가입 직후 바로 등록 화면으로 보내고, 본인 확인용 토큰과 이메일을 함께 넘긴다.
                navigate('/member/passwordless', {
                    state: { email, signupToken: result.passwordlessSignupToken },
                });
                return;
            }

            alert('회원 가입이 완료되었습니다.');
            navigate('/member/login');

        } catch (error) {
            if (axios.isAxiosError(error) && error.response?.data) {
                // 서버에서 받은 오류 정보를 그대로 화면에 뿌린다.
                setErrors(error.response.data);
            } else {
                setErrors({ general: '회원 가입 중에 오류가 발생하였습니다.' });
            }
        }
    };

    return (
        <div className="auth-shell">
            {/* ── 왼쪽: 사진 + 안내 ─────────────────────────── */}
            <section className="auth-visual" style={{ backgroundImage: VISUAL_IMAGE }}>
                <span className="pill">3 Role System</span>
                <h2>사용자와 중개인에게<br />필요한 화면을 다르게</h2>
                <p>역할에 맞는 정보만 입력하고, 가입 후 알맞은 화면으로 이동합니다.</p>

                <div className="points">
                    <div className="point"><i>U</i> 사용자: 취향 기반 매물 추천</div>
                    <div className="point"><i>B</i> 중개인: 매물 등록과 승인 관리</div>
                    <div className="point"><i>✓</i> 소셜 계정으로도 가입 가능</div>
                </div>
            </section>

            {/* ── 오른쪽: 입력 폼 ───────────────────────────── */}
            <section className="auth-area">
                <div className="eyebrow">Join</div>
                <h1>회원가입</h1>
                <p>역할을 선택하면 입력 항목이 달라집니다.</p>

                {/* 가입 유형: 일반 사용자 / 중개인 */}
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

                <form onSubmit={signupAction}>
                    {/* 두 유형 공통 입력 */}
                    <div className="auth-fields-2">
                        <div className="auth-field">
                            <label htmlFor="signup-name">이름</label>
                            <input
                                id="signup-name"
                                type="text"
                                placeholder="이름"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className={errors.name ? 'invalid' : ''}
                                required
                            />
                            {errors.name && <span className="msg">{errors.name}</span>}
                        </div>

                        <div className="auth-field">
                            <label htmlFor="signup-phone">전화번호</label>
                            <input
                                id="signup-phone"
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

                    <div className="auth-field">
                        <label htmlFor="signup-email">이메일</label>
                        <input
                            id="signup-email"
                            type="email"
                            placeholder="name@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className={errors.email ? 'invalid' : ''}
                            required
                        />
                        {errors.email && <span className="msg">{errors.email}</span>}
                    </div>

                    {/* 일반 사용자 전용: 중개인은 비밀번호 없이 가입한다 */}
                    {signupType === 'USER' && (
                        <>
                            <div className="auth-fields-2">
                                <div className="auth-field">
                                    <label htmlFor="signup-password">비밀번호</label>
                                    <input
                                        id="signup-password"
                                        type="password"
                                        placeholder="대문자+소문자+숫자+특수기호"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className={errors.password ? 'invalid' : ''}
                                        required
                                    />
                                    {errors.password && <span className="msg">{errors.password}</span>}
                                </div>

                                <div className="auth-field">
                                    <label htmlFor="signup-password-confirm">비밀번호 확인</label>
                                    <input
                                        id="signup-password-confirm"
                                        type="password"
                                        placeholder="다시 입력"
                                        value={passwordConfirm}
                                        onChange={(e) => setPasswordConfirm(e.target.value)}
                                        className={errors.passwordConfirm ? 'invalid' : ''}
                                        required
                                    />
                                    {errors.passwordConfirm && <span className="msg">{errors.passwordConfirm}</span>}
                                </div>
                            </div>

                            {/* 회원 주소는 "어느 지역에 사는지"만 알면 되므로 상세주소를 받지 않는다.
                                (나중에 지도 검색의 기본 지역으로 쓸 값이다) */}
                            <div className="auth-field">
                                <AddressInput
                                    label="주소 (선택)"
                                    value={address}
                                    withDetail={false}
                                    onChange={({ address: selectedAddress, selected }) => {
                                        setAddress(selectedAddress);
                                        if (selected) {
                                            setSigungu(selected.sigungu);
                                            setDong(selected.dong);
                                        }
                                    }}
                                />
                                {errors.address && <span className="msg">{errors.address}</span>}
                            </div>
                        </>
                    )}

                    {/* 중개인 전용 */}
                    {signupType === 'BROKER' && (
                        <>
                            <div className="auth-field">
                                <label htmlFor="signup-license">공인중개사 등록번호</label>
                                <input
                                    id="signup-license"
                                    type="text"
                                    placeholder="등록번호 입력"
                                    value={licenseNumber}
                                    onChange={(e) => setLicenseNumber(e.target.value)}
                                    className={errors.licenseNumber ? 'invalid' : ''}
                                    required
                                />
                                {errors.licenseNumber && <span className="msg">{errors.licenseNumber}</span>}
                            </div>

                            <div className="auth-field">
                                <label htmlFor="signup-agency-name">중개사무소명</label>
                                <input
                                    id="signup-agency-name"
                                    type="text"
                                    placeholder="사무소명 또는 사업자등록번호"
                                    value={agencyName}
                                    onChange={(e) => setAgencyName(e.target.value)}
                                    className={errors.agencyName ? 'invalid' : ''}
                                    required
                                />
                                {errors.agencyName && <span className="msg">{errors.agencyName}</span>}
                            </div>

                            <div className="auth-field">
                                <AddressInput
                                    label="중개사무소 주소"
                                    required
                                    value={agencyAddress}
                                    detail={agencyAddressDetail}
                                    onChange={({ address: selectedAddress, detail, selected }) => {
                                        setAgencyAddress(selectedAddress);
                                        setAgencyAddressDetail(detail);
                                        if (selected) {
                                            setAgencySigungu(selected.sigungu);
                                            setAgencyDong(selected.dong);
                                        }
                                    }}
                                />
                                {errors.agencyAddress && <span className="msg">{errors.agencyAddress}</span>}
                            </div>

                            <div className="auth-field">
                                <label htmlFor="signup-office-phone">사무실 번호</label>
                                <input
                                    id="signup-office-phone"
                                    type="text"
                                    placeholder="02-0000-0000"
                                    value={officePhone}
                                    onChange={(e) => setOfficePhone(e.target.value)}
                                    className={errors.officePhone ? 'invalid' : ''}
                                    required
                                />
                                {errors.officePhone && <span className="msg">{errors.officePhone}</span>}
                            </div>

                            <div className="auth-soft" style={{ marginTop: 16 }}>
                                <strong>등록번호는 가입 후 확인합니다</strong>
                                <p>
                                    공인중개사 등록번호와 중개사무소의 사실 여부는 가입 이후
                                    "내 정보 → 허가 요청" 단계에서 공공 데이터로 검증합니다.
                                </p>
                            </div>
                        </>
                    )}

                    {/* 약관 동의. 항목은 가입 유형에 따라 달라진다(중개인은 사무소 정보 공개가 추가). */}
                    <TermsAgreement
                        signupType={signupType}
                        value={agreements}
                        onChange={setAgreements}
                        error={errors.agreedTerms}
                    />

                    <button type="submit" className="auth-solid-btn" style={{ marginTop: 20 }}>
                        회원가입 완료
                    </button>
                </form>

                <div className="auth-or">소셜 계정으로 가입</div>

                {/*
                    소셜 가입도 로그인과 같은 주소로 시작한다. 처음 들어온 계정이면
                    백엔드가 추가정보 입력 화면(/oauth/signup)으로 보내 준다.
                */}
                <div className="auth-socials">
                    {SOCIAL_BUTTONS.map((social) => (
                        <a
                            key={social.provider}
                            href={`${API_BASE_URL}/oauth2/authorization/${social.provider}`}
                            className={`auth-social-btn ${social.className}`}
                        >
                            {social.label}
                        </a>
                    ))}
                </div>

                <p className="auth-foot">
                    이미 계정이 있나요?{' '}
                    <button type="button" onClick={() => navigate('/member/login')}>로그인</button>
                </p>
            </section>
        </div>
    );
};

export default App;
