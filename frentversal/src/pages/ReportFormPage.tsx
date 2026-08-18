import axios from 'axios';
import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { createReport } from '../api/reportApi';
import { REPORT_TARGET_LABELS, type ReportTargetType } from '../types/Report';
import type { User } from '../types/User';
import '../styles/ReportFormPage.css';

interface ReportFormPageProps {
    user: User | null;
}

interface SelectedTarget {
    type: ReportTargetType;
    id: number;
}

function getErrorMessage(error: unknown) {
    if (!axios.isAxiosError(error)) return undefined;
    const data = error.response?.data as { message?: string; error?: string } | undefined;
    return data?.message || data?.error;
}

function getSelectedTarget(searchParams: URLSearchParams): SelectedTarget | null {
    const candidates: Array<[ReportTargetType, string | null]> = [
        ['PROPERTY', searchParams.get('propertyId')],
        ['AGENCY', searchParams.get('agencyId')],
        ['REVIEW', searchParams.get('reviewId')],
    ];
    const selected = candidates.find(([, value]) => value !== null);
    if (!selected) return null;

    const targetId = Number(selected[1]);
    if (!Number.isInteger(targetId) || targetId < 1) return null;
    return { type: selected[0], id: targetId };
}

function ReportFormPage({ user }: ReportFormPageProps) {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const selectedTarget = useMemo(() => getSelectedTarget(searchParams), [searchParams]);
    const requestedReturnPath = searchParams.get('returnTo');
    const returnPath = requestedReturnPath?.startsWith('/') ? requestedReturnPath : '/report/history';
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    if (!user) {
        return <main className="report-page-bg"><section className="section"><div className="wrap report-narrow">
            <div className="report-state">신고를 접수하려면 로그인이 필요합니다.</div>
            <div className="report-actions"><Link className="solid-btn" to="/member/login">로그인</Link></div>
        </div></section></main>;
    }

    if (user.role === 'ADMIN') {
        return <main className="report-page-bg"><section className="section"><div className="wrap report-narrow">
            <div className="report-state">관리자는 신고를 접수할 수 없습니다.</div>
            <div className="report-actions"><Link className="ghost-btn" to="/admin/reports">신고 관리</Link></div>
        </div></section></main>;
    }

    if (!selectedTarget) {
        return <main className="report-page-bg"><section className="section"><div className="wrap report-narrow">
            <div className="report-state report-error">매물·중개사무소·리뷰 화면에서 신고 대상을 먼저 선택해 주세요.</div>
            <div className="report-actions"><Link className="ghost-btn" to="/">홈으로</Link></div>
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
            await createReport({
                targetType: selectedTarget.type,
                targetId: selectedTarget.id,
                title: normalizedTitle,
                content: normalizedContent,
            });
            window.alert('신고가 접수되었습니다.');
            navigate('/report/history', { replace: true });
        } catch (requestError) {
            console.error('신고 접수 실패', requestError);
            setError(getErrorMessage(requestError) || '신고를 접수하지 못했습니다. 잠시 후 다시 시도해 주세요.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <main className="report-page-bg"><section className="section"><div className="wrap report-form-wrap">
            <div className="breadcrumb"><Link to={returnPath}>이전 화면</Link> / 신고하기</div>
            <div className="report-form-grid">
                <aside className="report-form-guide">
                    <div className="eyebrow">Report</div>
                    <h1>{REPORT_TARGET_LABELS[selectedTarget.type]} 신고</h1>
                    <p>신고 내용과 신고자 정보는 관리자만 확인할 수 있습니다.</p>
                    <ul>
                        <li>확인이 필요한 사실을 구체적으로 작성해 주세요.</li>
                        <li>개인정보는 신고 내용에 포함하지 마세요.</li>
                        <li>처리 여부는 공개 신고 처리 내역에서 확인할 수 있습니다.</li>
                    </ul>
                </aside>
                <form className="report-form-card" onSubmit={handleSubmit}>
                    <div className="report-selected-target">
                        <span>신고 대상</span>
                        <strong>{REPORT_TARGET_LABELS[selectedTarget.type]} #{selectedTarget.id}</strong>
                    </div>
                    <div className="field">
                        <label htmlFor="report-title">제목</label>
                        <input id="report-title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={200} required />
                        <span className="report-count">{title.length} / 200</span>
                    </div>
                    <div className="field">
                        <label htmlFor="report-content">내용</label>
                        <textarea id="report-content" value={content} onChange={(event) => setContent(event.target.value)} required />
                    </div>
                    {error && <div className="report-inline-error">{error}</div>}
                    <div className="report-actions">
                        <Link className="ghost-btn" to={returnPath}>취소</Link>
                        <button className="danger-solid-btn" type="submit" disabled={submitting}>{submitting ? '접수 중' : '신고 접수'}</button>
                    </div>
                </form>
            </div>
        </div></section></main>
    );
}

export default ReportFormPage;
