import axios from 'axios';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';

import { getReport, processReport } from '../api/reportApi';
import {
    REPORT_STATUS_LABELS,
    REPORT_TARGET_LABELS,
    type Report,
    type ReportProcessPayload,
} from '../types/Report';
import type { User } from '../types/User';
import '../assets/common.css';
import '../assets/responsive.css';
import '../components/Report.css';

interface ReportAdminDetailPageProps { user: User | null; }

function formatDate(value: string | null) {
    if (!value) return '-';
    return new Intl.DateTimeFormat('ko-KR', {
        year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
    }).format(new Date(value));
}

function getErrorMessage(error: unknown) {
    if (!axios.isAxiosError(error)) return undefined;
    const data = error.response?.data as { message?: string; error?: string } | undefined;
    return data?.message || data?.error;
}

function ReportAdminDetailPage({ user }: ReportAdminDetailPageProps) {
    const { id } = useParams();
    const reportId = Number(id);
    const [report, setReport] = useState<Report | null>(null);
    const [status, setStatus] = useState<ReportProcessPayload['status']>('RESOLVED');
    const [answerContent, setAnswerContent] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        let active = true;
        const loadReport = async () => {
            if (!Number.isInteger(reportId) || reportId < 1) {
                setError('올바르지 않은 신고 번호입니다.'); setLoading(false); return;
            }
            try {
                const data = await getReport(reportId);
                if (active) setReport(data);
            } catch (requestError) {
                console.error('신고 상세 조회 실패', requestError);
                if (active) setError('신고 내용을 불러오지 못했습니다.');
            } finally {
                if (active) setLoading(false);
            }
        };
        if (user?.role === 'ADMIN') loadReport();
        return () => { active = false; };
    }, [reportId, user]);

    if (user?.role !== 'ADMIN') {
        return <div className="report-state report-error">관리자만 접근할 수 있습니다.</div>;
    }

    const handleProcess = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const normalizedAnswer = answerContent.trim();
        if (!normalizedAnswer) { setError('처리 답변을 입력해 주세요.'); return; }
        setSubmitting(true); setError('');
        try {
            const processed = await processReport(reportId, { status, answerContent: normalizedAnswer });
            setReport(processed);
        } catch (requestError) {
            console.error('신고 처리 실패', requestError);
            setError(getErrorMessage(requestError) || '신고를 처리하지 못했습니다.');
        } finally {
            setSubmitting(false);
        }
    };

    // 바깥 레이아웃은 관리자 콘솔(AdminConsolePage)이 맡는다. 여기서는 패널 내용만 그린다.
    return (
        <div className="report-detail-wrap">
            <div className="breadcrumb"><Link to="/admin/reports">신고 관리</Link> / 상세</div>
            {loading && <div className="report-state">신고 내용을 불러오는 중입니다.</div>}
            {!loading && !report && <div className="report-state report-error">{error || '신고 내용을 찾을 수 없습니다.'}</div>}
            {report && <div className="report-detail-grid">
                <article className="report-detail-card">
                    <header><span className={`status ${report.status === 'RESOLVED' ? 'green' : report.status === 'REJECTED' ? 'red' : 'orange'}`}>{REPORT_STATUS_LABELS[report.status]}</span><h1>{report.title}</h1>
                        <div className="report-detail-meta"><span>신고자 {report.reporterName}</span><span>접수 {formatDate(report.createdAt)}</span><span>{REPORT_TARGET_LABELS[report.targetType]} #{report.targetId}</span></div>
                    </header>
                    <div className="report-detail-content">{report.content}</div>
                </article>
                <aside className="report-process-panel">
                    <h2>처리 결과</h2>
                    {report.status === 'PENDING' ? <form onSubmit={handleProcess}>
                        <div className="field"><label htmlFor="process-status">처리 상태</label><select id="process-status" value={status} onChange={(event) => setStatus(event.target.value as ReportProcessPayload['status'])}><option value="RESOLVED">서비스에 적용</option><option value="REJECTED">취소 처리</option></select></div>
                        <div className="field"><label htmlFor="answer-content">답변</label><textarea id="answer-content" value={answerContent} onChange={(event) => setAnswerContent(event.target.value)} placeholder="신고자에게 전달할 처리 결과를 입력해 주세요" required /></div>
                        {error && <div className="report-inline-error">{error}</div>}
                        <button className="solid-btn report-process-submit" type="submit" disabled={submitting}>{submitting ? '처리 중' : '처리 결과 저장'}</button>
                    </form> : <div className="report-processed-answer"><span className={`status ${report.status === 'RESOLVED' ? 'green' : 'red'}`}>{REPORT_STATUS_LABELS[report.status]}</span><p>{report.answerContent}</p><time>{formatDate(report.processedAt)}</time></div>}
                </aside>
            </div>}
            <div className="report-actions"><Link className="ghost-btn" to="/admin/reports">목록으로</Link></div>
        </div>
    );
}

export default ReportAdminDetailPage;
