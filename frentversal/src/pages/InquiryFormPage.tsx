import axios from 'axios';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { sendInquiry } from '../api/inquiryApi';
import type { User } from '../types/User';
import '../styles/InquiryFormPage.css';

interface Props {
    user: User | null;
}

function getErrorMessage(error: unknown) {
    if (!axios.isAxiosError(error)) return undefined;
    const data = error.response?.data as { message?: string; error?: string } | undefined;
    return data?.message || data?.error;
}

function InquiryFormPage({ user }: Props) {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const propertyId = Number(searchParams.get('propertyId'));
    const validPropertyId = Number.isInteger(propertyId) && propertyId > 0;
    const propertyName = searchParams.get('propertyName') ?? '';
    const requestedReturnPath = searchParams.get('returnTo');
    const returnPath = requestedReturnPath?.startsWith('/') ? requestedReturnPath : '/';

    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    if (!user) {
        return <main><section className="section"><div className="wrap inquiry-narrow">
            <p className="dim">문의를 보내려면 로그인이 필요합니다.</p>
            <Link className="solid-btn" to="/member/login" style={{ marginTop: 14, display: 'inline-flex' }}>로그인</Link>
        </div></section></main>;
    }

    if (user.role !== 'USER') {
        return <main><section className="section"><div className="wrap inquiry-narrow">
            <p className="dim">일반 사용자만 중개사무소에 문의를 보낼 수 있습니다.</p>
        </div></section></main>;
    }

    if (!validPropertyId) {
        return <main><section className="section"><div className="wrap inquiry-narrow">
            <p style={{ color: 'var(--red)' }}>매물 상세 화면에서 "중개사 문의" 버튼으로 들어와 주세요.</p>
            <Link className="ghost-btn" to="/" style={{ marginTop: 14, display: 'inline-flex' }}>홈으로</Link>
        </div></section></main>;
    }

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const normalizedTitle = title.trim();
        const normalizedContent = content.trim();

        if (!normalizedTitle || !normalizedContent) {
            setError('제목과 내용을 모두 입력해 주세요.');
            return;
        }

        setSubmitting(true);
        setError('');
        try {
            const message = await sendInquiry({
                propertyId,
                title: normalizedTitle,
                content: normalizedContent,
            });
            window.alert(message || '문의가 접수되었습니다.');
            navigate(returnPath, { replace: true });
        } catch (requestError) {
            console.error('문의 접수 실패', requestError);
            setError(getErrorMessage(requestError) || '문의를 접수하지 못했습니다. 잠시 후 다시 시도해 주세요.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <main>
            <section className="page-hero"><div className="wrap">
                <div>
                    <div className="eyebrow">Inquiry</div>
                    <h1>문의하기</h1>
                    <p>중개사무소에 문의를 보냅니다.</p>
                </div>
            </div></section>

            <section className="section"><div className="wrap inquiry-wrap">
                <form className="surface shadow inquiry-card" onSubmit={handleSubmit}>
                    <h2>문의하기</h2>

                    <p className="xs dim" style={{ marginTop: 8 }}>
                        문의 매물 · {propertyName || `#${propertyId}`}
                    </p>

                    <div className="field">
                        <label>제목</label>
                        <input
                            placeholder="문의 제목"
                            value={title}
                            onChange={(event) => setTitle(event.target.value)}
                            maxLength={200}
                            required
                        />
                    </div>
                    <div className="field">
                        <label>내용</label>
                        <textarea
                            placeholder="문의 내용을 입력하세요"
                            value={content}
                            onChange={(event) => setContent(event.target.value)}
                            required
                        />
                    </div>

                    {error && <p className="xs" style={{ color: 'var(--red)', marginTop: 10 }}>{error}</p>}

                    <div className="row" style={{ justifyContent: 'flex-end', marginTop: 18, gap: 8 }}>
                        <Link className="ghost-btn" to={returnPath}>취소</Link>
                        <button className="solid-btn" type="submit" disabled={submitting}>
                            {submitting ? '접수 중' : '보내기'}
                        </button>
                    </div>
                </form>
            </div></section>
        </main>
    );
}

export default InquiryFormPage;