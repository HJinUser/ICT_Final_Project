import { useState } from "react";

import TermsBody from "./TermsBody";
import type { AgreementCode, AgreementState } from "../types/Terms";
import { isRequired, termsFor } from "../types/Terms";
import type { SignupType } from "../types/Auth";
import "../styles/Terms.css";

/*
  회원가입 화면의 약관 동의 묶음.

  일반 회원가입(SignupPage)과 소셜 회원가입(SocialSignupPage)이 같은 항목을 받아야 해서
  컴포넌트로 빼 두었다. 어떤 항목을 보여줄지는 Terms.ts의 showFor/requiredFor가 정하므로,
  약관이 늘거나 필수 여부가 바뀌어도 이 파일은 고칠 필요가 없다.

  동의 값은 부모(가입 화면)가 갖고 있다. 가입 요청을 보내는 쪽이 부모라서,
  여기서 상태를 들고 있으면 제출할 때 값을 꺼내기가 번거로워진다.
*/

type Props = {
    signupType: SignupType;
    value: AgreementState;
    onChange: (next: AgreementState) => void;
    // 필수 항목을 빠뜨렸을 때 부모가 내려주는 안내 문구
    error?: string;
};

function App({ signupType, value, onChange, error }: Props) {
    // 펼쳐서 본문을 보고 있는 항목들. 여러 개를 동시에 펼칠 수 있다.
    const [opened, setOpened] = useState<AgreementCode[]>([]);

    const docs = termsFor(signupType);
    const allChecked = docs.every((doc) => value[doc.code]);

    const toggleOne = (code: AgreementCode, checked: boolean) => {
        onChange({ ...value, [code]: checked });
    };

    // 전체 동의는 지금 화면에 보이는 항목만 건드린다.
    // (사용자 탭에서 켠 값이 중개인 탭의 안 보이는 항목까지 켜지면 안 된다)
    const toggleAll = (checked: boolean) => {
        const next: AgreementState = { ...value };
        docs.forEach((doc) => {
            next[doc.code] = checked;
        });
        onChange(next);
    };

    const toggleOpen = (code: AgreementCode) => {
        setOpened((prev) =>
            prev.includes(code) ? prev.filter((item) => item !== code) : [...prev, code]
        );
    };

    return (
        <div className="terms-agree">
            {/* 전체 동의 */}
            <div className="terms-all">
                <input
                    id="terms-all"
                    type="checkbox"
                    checked={allChecked}
                    onChange={(e) => toggleAll(e.target.checked)}
                />
                <label htmlFor="terms-all">
                    <strong>전체 동의</strong>
                    <span>선택 항목을 포함한 모든 약관에 동의합니다.</span>
                </label>
            </div>

            {/* 항목별 동의 */}
            <ul className="terms-list">
                {docs.map((doc) => {
                    const required = isRequired(doc, signupType);
                    const isOpen = opened.includes(doc.code);
                    const inputId = `terms-${doc.code}`;

                    return (
                        <li key={doc.code}>
                            <div className="terms-row">
                                <input
                                    id={inputId}
                                    type="checkbox"
                                    checked={!!value[doc.code]}
                                    onChange={(e) => toggleOne(doc.code, e.target.checked)}
                                />
                                <label htmlFor={inputId}>
                                    <span className={required ? 'terms-tag req' : 'terms-tag opt'}>
                                        {required ? '필수' : '선택'}
                                    </span>
                                    {doc.title}
                                    <em>{doc.summary}</em>
                                </label>

                                <button
                                    type="button"
                                    className="terms-open"
                                    aria-expanded={isOpen}
                                    aria-controls={`terms-detail-${doc.code}`}
                                    onClick={() => toggleOpen(doc.code)}
                                >
                                    {isOpen ? '접기' : '보기'}
                                </button>
                            </div>

                            {isOpen && (
                                <div className="terms-detail" id={`terms-detail-${doc.code}`}>
                                    <div className="terms-meta">
                                        {doc.version} · {doc.effectiveDate} 시행
                                    </div>
                                    <TermsBody sections={doc.sections} />
                                </div>
                            )}
                        </li>
                    );
                })}
            </ul>

            {error && <p className="terms-error">{error}</p>}
        </div>
    );
};

export default App;
