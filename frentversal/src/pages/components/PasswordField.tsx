/*
  비밀번호 입력 한 칸.

  로그인·회원가입이 같은 규칙을 써야 해서 한곳으로 묶었다.

  두 가지를 처리한다.
  1) Caps Lock 안내
     비밀번호는 글자가 가려져 있어서 대문자로 잘못 치고 있어도 눈치채기 어렵다.
     키 이벤트의 getModifierState('CapsLock') 로 확인해 켜져 있으면 안내를 띄운다.
     (포커스를 잃으면 안내를 지운다. 키를 누르기 전까지는 상태를 알 수 없어서 미리 띄우지 않는다)
  2) 눈 아이콘(내용 보기) 차단
     allowReveal={false} 이면 브라우저가 붙이는 "내용 표시" 단추를 감춘다.
     "비밀번호 확인" 칸은 눈으로 보고 맞추는 게 아니라 직접 다시 입력해서 확인하는 칸이라 막는다.
*/

import { useState } from 'react';

interface Props {
    id: string;
    label: string;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    required?: boolean;
    // 값이 잘못됐을 때 아래에 보여 줄 문구
    errorMessage?: string;
    // false 면 브라우저의 "내용 표시"(눈 아이콘) 단추를 감춘다. 기본값은 true.
    allowReveal?: boolean;
    autoComplete?: string;
}

function PasswordField({
    id,
    label,
    value,
    onChange,
    placeholder,
    required,
    errorMessage,
    allowReveal = true,
    autoComplete,
}: Props) {
    const [capsLockOn, setCapsLockOn] = useState(false);

    // 키를 누르거나 뗄 때마다 Caps Lock 상태를 다시 확인한다.
    const checkCapsLock = (event: React.KeyboardEvent<HTMLInputElement>) => {
        setCapsLockOn(event.getModifierState('CapsLock'));
    };

    const className = [
        errorMessage ? 'invalid' : '',
        allowReveal ? '' : 'no-reveal',
    ].filter(Boolean).join(' ');

    return (
        <div className="auth-field">
            <label htmlFor={id}>{label}</label>

            <input
                id={id}
                type="password"
                placeholder={placeholder}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                onKeyDown={checkCapsLock}
                onKeyUp={checkCapsLock}
                onBlur={() => setCapsLockOn(false)}
                className={className || undefined}
                required={required}
                autoComplete={autoComplete}
            />

            {capsLockOn && (
                <span className="auth-caps" role="status">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                        <path d="M12 4l7 7h-4v4h-6v-4H5z" />
                        <path d="M9 19h6" />
                    </svg>
                    Caps Lock이 켜져 있습니다.
                </span>
            )}

            {errorMessage && <span className="msg">{errorMessage}</span>}
        </div>
    );
}

export default PasswordField;
