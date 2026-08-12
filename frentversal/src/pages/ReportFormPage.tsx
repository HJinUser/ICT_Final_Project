import axios from 'axios';
import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { createReport } from '../api/reportApi';
import type { ReportTargetType } from '../types/Report';
import type { User } from '../types/User';
import '../assets/common.css';
import '../assets/responsive.css';
import '../components/Report.css';

interface ReportFormPageProps {
    user: User | null;
}

function getErrorMessage(error: unknown) {
    if (!axios.isAxiosError(error)) return undefined;
    const data = error.response?.data as { message?: string; error?: string } | undefined;
    return data?.message || data?.error;
}

function ReportFormPage({ user }: ReportFormPageProps) {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const initialTarget = useMemo(() => {
        const propertyId = Number(searchParams.get('propertyId'));
        const reviewId = Number(searchParams.get('reviewId'));

        if (Number.isInteger(propertyId) && propertyId > 0) {
            return { type: 'PROPERTY' as const, id: propertyId, fixed: true };
        }
        if (Number.isInteger(reviewId) && reviewId > 0) {
            return { type: 'REVIEW' as const, id: reviewId, fixed: true };
        }
        return { type: 'PROPERTY' as const, id: 0, fixed: false };
    }, [searchParams]);

    const [targetType, setTargetType] = useState<ReportTargetType>(initialTarget.type);
    const [targetId, setTargetId] = useState(initialTarget.id ? String(initialTarget.id) : '');
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    if (!user) {
        return (
            <main className="report-page-bg"><section className="section"><div className="wrap report-narrow">
                <div className="report-state">신고를 접수하려면 로그인이 필요합니다.</div>
                <div className="report-actions"><Link className="solid-btn" to="/member/login">로그인</Link></div>
            </div></section></main>
        );
    }

    if (user.role === 'ADMIN') {
        return (
            <main className="report-page-bg"><section className="section"><div className="wrap report-narrow">
                <div className="report-state">관리자는 신고를 접수할 수 없습니다.</div>
                <div className="report-actions"><Link className="ghost-btn" to="/admin/reports">신고 관리</Link></div>
            </div></section></main>
        );
    }

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const parsedTargetId = Number(targetId);
        const normalizedTitle = title.trim();
        const normalizedContent = content.trim();

        if (!Number.isInteger(parsedTargetId) || parsedTargetId < 1) {
            setError('신고 대상 번호를 정확히 입력해 주세요.');
            return;
        }
        if (!normalizedTitle || !normalizedContent) {
            setError('제목과 내용을 모두 입력해 주세요.');
            return;
        }
        if (normalizedTitle.length > 200) {
            setError('제목은 200자 이하로 입력해 주세요.');
            return;
        }

        setSubmitting(true);
        setError('');
        try {
            await createReport({
                targetType,
                targetId: parsedTargetId,
                title: normalizedTitle,
                content: normalizedContent,
            });
            window.alert('신고가 접수되었습니다.');
            if (window.history.length > 1) navigate(-1);
            else navigate('/report/me', { replace: true });
        } catch (requestError) {
            console.error('신고 접수 실패', requestError);
            setError(getErrorMessage(requestError) || '신고를 접수하지 못했습니다. 잠시 후 다시 시도해 주세요.');
            setSubmitting(false);
        }
    };

    return (
        <main className="report-page-bg">
            <section className="section">
                <div className="wrap report-form-wrap">
                    <div className="breadcrumb"><Link to="/">홈</Link> / 신고하기</div>
                    <div className="report-form-grid">
                        <aside className="report-form-guide">
                            <div className="eyebrow">Report</div>
                            <h1>신고하기</h1>
                            <p>허위 매물이나 부적절한 리뷰를 발견했다면 구체적인 내용을 알려주세요.</p>
                            <ul>
                                <li>사실 확인이 가능한 내용을 작성해 주세요.</li>
                                <li>개인정보는 신고 내용에 포함하지 마세요.</li>
                                <li>접수 결과는 내 신고 내역에서 확인할 수 있습니다.</li>
                            </ul>
                        </aside>
                        <form className="report-form-card" onSubmit={handleSubmit}>
                            <div className="fields-2">
                                <div className="field">
                                    <label htmlFor="report-target-type">신고 대상</label>
                                    <select
                                        id="report-target-type"
                                        value={targetType}
                                        disabled={initialTarget.fixed}
                                        onChange={(event) => setTargetType(event.target.value as ReportTargetType)}
                                    >
                                        <option value="PROPERTY">매물</option>
                                        <option value="REVIEW">리뷰</option>
                                    </select>
                                </div>
                                <div className="field">
                                    <label htmlFor="report-target-id">대상 번호</label>
                                    <input
                                        id="report-target-id"
                                        type="number"
                                        min="1"
                                        value={targetId}
                                        readOnly={initialTarget.fixed}
                                        onChange={(event) => setTargetId(event.target.value)}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="field">
                                <label htmlFor="report-title">제목</label>
                                <input
                                    id="report-title"
                                    value={title}
                                    onChange={(event) => setTitle(event.target.value)}
                                    maxLength={200}
                                    placeholder="신고 제목을 입력해 주세요"
                                    required
                                />
                                <span className="report-count">{title.length} / 200</span>
                            </div>
                            <div className="field">
                                <label htmlFor="report-content">내용</label>
                                <textarea
                                    id="report-content"
                                    value={content}
                                    onChange={(event) => setContent(event.target.value)}
                                    placeholder="신고 사유와 확인이 필요한 내용을 자세히 입력해 주세요"
                                    required
                                />
                            </div>
                            {error && <div className="report-inline-error">{error}</div>}
                            <div className="report-actions">
                                <button className="ghost-btn" type="button" onClick={() => navigate(-1)}>취소</button>
                                <button className="danger-solid-btn" type="submit" disabled={submitting}>
                                    {submitting ? '접수 중' : '보내기'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </section>
        </main>
    );
}

export default ReportFormPage;
