/*
  비밀번호 찾기(재설정) 화면.

  이메일 -> 인증번호 -> 새 비밀번호 -> 완료 를 한 페이지에서 단계로 넘긴다.
  라우트를 나누지 않는 이유는, 중간 단계의 주소를 그대로 다시 열면 앞 단계에서 받은
  이메일과 재설정 토큰이 없어 아무것도 못 하는 빈 화면이 되기 때문이다.

  서버 정책(인증번호 5분 만료 / 5회 시도 / 60초 재전송 쿨타임)은 PasswordResetService 가 갖고 있고,
  이 화면은 같은 숫자로 남은 시간을 세어서 보여 주기만 한다. 최종 판정은 항상 서버가 한다.
*/

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

import { confirmNewPassword, sendResetCode, verifyResetCode } from '../api/passwordResetApi';
import PasswordField from './components/PasswordField';
import {
    CODE_LENGTH,
    CODE_TTL_SECONDS,
    RESEND_COOLDOWN_SECONDS,
    validateNewPassword,
} from '../types/PasswordReset';
import type { PasswordResetStep } from '../types/PasswordReset';
import '../styles/FindPasswordPage.css';

// 왼쪽 사진 영역 배경. 서버에서 받아올 값이 아니라 화면 장식이라 상수로 둔다.
const VISUAL_IMAGE =
    "linear-gradient(160deg,rgba(49,0,90,.95),rgba(75,0,130,.72))," +
    "url('https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1000&q=70')";

// 위쪽에 보여 줄 단계 표시. 'done'은 완료 안내라 여기 넣지 않는다.
const STEP_LABELS: { key: PasswordResetStep; label: string }[] = [
    { key: 'email', label: '이메일 확인' },
    { key: 'code', label: '인증번호 입력' },
    { key: 'password', label: '새 비밀번호' },
];

// 남은 시간을 분:초로 바꾼다 (예: 245 -> "4:05")
function formatSeconds(total: number): string {
    const minutes = Math.floor(total / 60);
    const seconds = total % 60;
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/*
  서버가 내려준 안내 문구를 꺼낸다.

  이 화면의 오류는 대부분 "왜 안 되는지"를 서버만 알고 있다(쿨타임 남은 초, 남은 시도 횟수,
  패스워드리스 전용 계정 안내 등). 그래서 서버 message 를 우선 보여 주고,
  네트워크 장애처럼 응답 자체가 없을 때만 기본 문구로 대체한다.
*/
function readErrorMessage(error: unknown, fallback: string): string {
    if (axios.isAxiosError(error) && error.response?.data?.message) {
        return String(error.response.data.message);
    }
    return fallback;
}

function FindPasswordPage() {
    const navigate = useNavigate();

    const [step, setStep] = useState<PasswordResetStep>('email');

    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // 2단계에서 받아 3단계에 그대로 넘길 단기 토큰
    const [resetToken, setResetToken] = useState('');

    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');

    // 요청이 나가 있는 동안 버튼을 잠가 같은 요청이 두 번 나가지 않게 한다
    const [submitting, setSubmitting] = useState(false);

    // 인증번호 남은 유효 시간(초)과 재전송 버튼이 열릴 때까지 남은 시간(초)
    const [ttlLeft, setTtlLeft] = useState(0);
    const [cooldownLeft, setCooldownLeft] = useState(0);

    /*
      1초마다 두 카운트다운을 함께 줄인다.

      인증번호 화면에 있을 때만 돌린다. 다른 단계에서는 볼 값이 아니고,
      단계를 벗어나면 정리 함수가 타이머를 지우므로 화면을 떠난 뒤에도 남지 않는다.
    */
    useEffect(() => {
        if (step !== 'code') {
            return;
        }

        const timer = window.setInterval(() => {
            setTtlLeft((prev) => (prev > 0 ? prev - 1 : 0));
            setCooldownLeft((prev) => (prev > 0 ? prev - 1 : 0));
        }, 1000);

        return () => window.clearInterval(timer);
    }, [step]);

    // 1단계 제출과 2단계의 "재전송"이 같은 요청을 쓴다. isResend 는 안내 문구만 다르게 하려는 값이다.
    const requestCode = async (isResend: boolean) => {
        setError('');
        setNotice('');

        const target = email.trim();
        if (!target) {
            setError('이메일을 입력해 주세요.');
            return;
        }

        setSubmitting(true);

        try {
            const data = await sendResetCode(target);

            setStep('code');
            setCode('');
            setTtlLeft(CODE_TTL_SECONDS);
            setCooldownLeft(RESEND_COOLDOWN_SECONDS);
            setNotice(isResend ? '인증번호를 다시 보냈습니다.' : data.message);
        } catch (err) {
            setError(readErrorMessage(err, '인증번호를 보내지 못했습니다. 잠시 후 다시 시도해 주세요.'));
        } finally {
            setSubmitting(false);
        }
    };

    const handleSendSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        requestCode(false);
    };

    const handleVerifySubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError('');
        setNotice('');

        if (code.trim().length !== CODE_LENGTH) {
            setError(`인증번호 ${CODE_LENGTH}자리를 입력해 주세요.`);
            return;
        }

        // 만료된 뒤에 보내면 어차피 서버가 거절하지만, 굳이 왕복하지 않고 여기서 먼저 알려 준다
        if (ttlLeft <= 0) {
            setError('인증번호가 만료되었습니다. 재전송을 눌러 다시 받아 주세요.');
            return;
        }

        setSubmitting(true);

        try {
            const data = await verifyResetCode(email.trim(), code.trim());
            setResetToken(data.resetToken);
            setStep('password');
        } catch (err) {
            setError(readErrorMessage(err, '인증번호를 확인하지 못했습니다.'));
        } finally {
            setSubmitting(false);
        }
    };

    const handleConfirmSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError('');

        // 서버도 같은 규칙으로 다시 확인하지만, 여기서 먼저 걸러 왕복을 줄인다
        const ruleMessage = validateNewPassword(newPassword);
        if (ruleMessage) {
            setError(ruleMessage);
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('비밀번호가 서로 다릅니다.');
            return;
        }

        setSubmitting(true);

        try {
            await confirmNewPassword(resetToken, newPassword);
            setStep('done');
        } catch (err) {
            setError(readErrorMessage(err, '비밀번호를 변경하지 못했습니다.'));
        } finally {
            setSubmitting(false);
        }
    };

    // 입력 중인 비밀번호에 대한 실시간 안내. 아직 아무것도 안 쳤을 때는 띄우지 않는다.
    const passwordRuleMessage = newPassword ? validateNewPassword(newPassword) : '';
    const passwordMismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;

    return (
        <div className="auth-shell">
            {/* ── 왼쪽: 사진 + 안내 ─────────────────────────── */}
            <section className="auth-visual" style={{ backgroundImage: VISUAL_IMAGE }}>
                <span className="pill">계정 찾기</span>
                <h2>비밀번호를<br />다시 설정합니다</h2>
                <p>가입할 때 쓴 이메일로 인증번호를 보내 드립니다.</p>

                <div className="points">
                    <div className="point"><i>1</i> 가입한 이메일 주소 확인</div>
                    <div className="point"><i>2</i> 메일로 받은 {CODE_LENGTH}자리 인증번호 입력</div>
                    <div className="point"><i>3</i> 새 비밀번호 설정 후 로그인</div>
                </div>
            </section>

            {/* ── 오른쪽: 단계별 입력 폼 ─────────────────────── */}
            <section className="auth-area">
                <div className="eyebrow">Reset Password</div>
                <h1>비밀번호 찾기</h1>
                <p>
                    {step === 'done'
                        ? '비밀번호가 새로 설정되었습니다.'
                        : '가입할 때 사용한 이메일 주소를 입력해 주세요.'}
                </p>

                {/* 지금 어느 단계인지 표시. 완료 화면에서는 감춘다. */}
                {step !== 'done' && (
                    <ol className="findpw-steps">
                        {STEP_LABELS.map((item, index) => (
                            <li
                                key={item.key}
                                className={item.key === step ? 'on' : ''}
                            >
                                <span className="findpw-step-no">{index + 1}</span>
                                {item.label}
                            </li>
                        ))}
                    </ol>
                )}

                {error && <div className="auth-alert">{error}</div>}
                {notice && !error && <div className="findpw-notice">{notice}</div>}

                {/* ── 1단계: 이메일 ─────────────────────────── */}
                {step === 'email' && (
                    <form onSubmit={handleSendSubmit}>
                        <div className="auth-field">
                            <label htmlFor="findpw-email">이메일</label>
                            <input
                                id="findpw-email"
                                type="email"
                                placeholder="name@example.com"
                                value={email}
                                onChange={(event) => setEmail(event.target.value)}
                                autoComplete="email"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            className="auth-solid-btn"
                            style={{ marginTop: 20 }}
                            disabled={submitting}
                        >
                            {submitting ? '보내는 중...' : '인증번호 받기'}
                        </button>

                        <p className="findpw-hint">
                            소셜 로그인이나 패스워드리스로 가입한 계정은 비밀번호가 없어
                            이 방법으로 찾을 수 없습니다.
                        </p>
                    </form>
                )}

                {/* ── 2단계: 인증번호 ───────────────────────── */}
                {step === 'code' && (
                    <form onSubmit={handleVerifySubmit}>
                        <div className="auth-field">
                            <label htmlFor="findpw-code">
                                인증번호 {CODE_LENGTH}자리
                            </label>
                            <input
                                id="findpw-code"
                                // number 로 두면 화살표 단추가 생기고 앞자리 0 이 지워져 text 로 받는다
                                type="text"
                                inputMode="numeric"
                                autoComplete="one-time-code"
                                placeholder="000000"
                                className="findpw-code-input"
                                value={code}
                                onChange={(event) =>
                                    // 숫자만 남기고 자릿수를 넘지 않게 자른다
                                    setCode(event.target.value.replace(/[^0-9]/g, '').slice(0, CODE_LENGTH))
                                }
                                required
                            />
                            <span className={ttlLeft > 0 ? 'findpw-timer' : 'findpw-timer expired'}>
                                {ttlLeft > 0
                                    ? `남은 시간 ${formatSeconds(ttlLeft)}`
                                    : '인증번호가 만료되었습니다.'}
                            </span>
                        </div>

                        <button
                            type="submit"
                            className="auth-solid-btn"
                            style={{ marginTop: 20 }}
                            disabled={submitting || ttlLeft <= 0}
                        >
                            {submitting ? '확인 중...' : '인증번호 확인'}
                        </button>

                        <div className="findpw-actions">
                            <button
                                type="button"
                                onClick={() => requestCode(true)}
                                disabled={submitting || cooldownLeft > 0}
                            >
                                {cooldownLeft > 0 ? `재전송 (${cooldownLeft}초)` : '인증번호 재전송'}
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    setStep('email');
                                    setCode('');
                                    setError('');
                                    setNotice('');
                                }}
                                disabled={submitting}
                            >
                                이메일 다시 입력
                            </button>
                        </div>
                    </form>
                )}

                {/* ── 3단계: 새 비밀번호 ─────────────────────── */}
                {step === 'password' && (
                    <form onSubmit={handleConfirmSubmit}>
                        <PasswordField
                            id="findpw-new"
                            label="새 비밀번호"
                            placeholder="영문 대소문자, 숫자, 특수문자 포함 8자 이상"
                            value={newPassword}
                            onChange={setNewPassword}
                            errorMessage={passwordRuleMessage}
                            autoComplete="new-password"
                            required
                        />

                        {/* 확인 칸은 눈으로 맞추는 곳이 아니라 다시 입력해서 확인하는 곳이라 눈 아이콘을 막는다 */}
                        <PasswordField
                            id="findpw-new-confirm"
                            label="새 비밀번호 확인"
                            placeholder="한 번 더 입력"
                            value={confirmPassword}
                            onChange={setConfirmPassword}
                            errorMessage={passwordMismatch ? '비밀번호가 서로 다릅니다.' : ''}
                            allowReveal={false}
                            autoComplete="new-password"
                            required
                        />

                        <button
                            type="submit"
                            className="auth-solid-btn"
                            style={{ marginTop: 20 }}
                            disabled={submitting}
                        >
                            {submitting ? '변경 중...' : '비밀번호 변경'}
                        </button>
                    </form>
                )}

                {/* ── 완료 ──────────────────────────────────── */}
                {step === 'done' && (
                    <div className="auth-soft">
                        <strong>비밀번호가 변경되었습니다</strong>
                        <p>보안을 위해 기존에 로그인해 둔 기기에서는 다시 로그인해야 합니다.</p>

                        <button
                            type="button"
                            className="auth-solid-btn"
                            style={{ marginTop: 16 }}
                            onClick={() => navigate('/member/login')}
                        >
                            로그인하러 가기
                        </button>
                    </div>
                )}

                {step !== 'done' && (
                    <p className="auth-foot">
                        비밀번호가 기억나셨나요?{' '}
                        <button type="button" onClick={() => navigate('/member/login')}>
                            로그인
                        </button>
                    </p>
                )}
            </section>
        </div>
    );
}

export default FindPasswordPage;
