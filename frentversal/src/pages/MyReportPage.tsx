import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { getMyReports } from '../api/reportApi';
import type { Report, ReportStatus } from '../types/Report';
import type { User } from '../types/User';
import '../assets/common.css';
import '../assets/responsive.css';
import '../components/Report.css';

interface MyReportPageProps {
    user: User | null;
}

const STATUS_LABELS: Record<ReportStatus, string> = {
    PENDING: '접수',
    RESOLVED: '처리 완료',
    REJECTED: '반려',
};

function formatDate(value: string | null) {
    if (!value) return '-';
    return new Intl.DateTimeFormat('ko-KR', {
        year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
    }).format(new Date(value));
}

function MyReportPage({ user }: MyReportPageProps) {
    const [reports, setReports] = useState<Report[]>([]);
    const [status, setStatus] = useState<ReportStatus | 'ALL'>('ALL');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let active = true;
        const loadReports = async () => {
            try {
                const data = await getMyReports();
                if (active) setReports(data);
            } catch (requestError) {
                console.error('내 신고 조회 실패', requestError);
                if (active) setError('신고 내역을 불러오지 못했습니다.');
            } finally {
                if (active) setLoading(false);
            }
        };
        if (user && user.role !== 'ADMIN') loadReports();
        return () => { active = false; };
    }, [user]);

    const filteredReports = useMemo(
        () => status === 'ALL' ? reports : reports.filter((report) => report.status === status),
        [reports, status],
    );

    if (!user) {
        return <main className="report-page-bg"><section className="section"><div className="wrap report-narrow"><div className="report-state">로그인이 필요합니다.</div></div></section></main>;
    }

    if (user.role === 'ADMIN') {
        return <main className="report-page-bg"><section className="section"><div className="wrap report-narrow"><div className="report-state">관리자는 신고 관리 화면을 이용해 주세요.</div><div className="report-actions"><Link className="solid-btn" to="/admin/reports">신고 관리</Link></div></div></section></main>;
    }

    return (
        <main className="report-page-bg">
            <section className="page-hero report-hero"><div className="wrap">
                <div><div className="eyebrow">My reports</div><h1>내 신고 내역</h1><p>접수한 신고의 진행 상태와 관리자 답변을 확인합니다.</p></div>
                <div className="hero-stat"><span className="mono dim">전체 신고</span><strong>{reports.length}건</strong><span className="xs dim">최신 접수순</span></div>
            </div></section>
            <section className="section"><div className="wrap report-list-wrap">
                <div className="report-filter-row">
                    <div className="chip-group">
                        {(['ALL', 'PENDING', 'RESOLVED', 'REJECTED'] as const).map((item) => (
                            <button className={`filter-chip${status === item ? ' on' : ''}`} type="button" onClick={() => setStatus(item)} key={item}>
                                {item === 'ALL' ? '전체' : STATUS_LABELS[item]}
                            </button>
                        ))}
                    </div>
                    <Link className="danger-outline-btn" to="/report/form">신고하기</Link>
                </div>
                {loading && <div className="report-state">신고 내역을 불러오는 중입니다.</div>}
                {!loading && error && <div className="report-state report-error">{error}</div>}
                {!loading && !error && filteredReports.length === 0 && <div className="report-state">신고 내역이 없습니다.</div>}
                <div className="report-card-list">
                    {filteredReports.map((report) => (
                        <article className="report-card" key={report.id}>
                            <header>
                                <div className="report-card-title">
                                    <span className={`status ${report.status === 'RESOLVED' ? 'green' : report.status === 'REJECTED' ? 'red' : 'orange'}`}>{STATUS_LABELS[report.status]}</span>
                                    <h2>{report.title}</h2>
                                </div>
                                <time>{formatDate(report.createdAt)}</time>
                            </header>
                            <div className="report-target">{report.targetType === 'PROPERTY' ? '매물' : '리뷰'} #{report.targetId}</div>
                            <p className="report-body">{report.content}</p>
                            <section className={`report-answer${report.answerContent ? ' answered' : ''}`}>
                                <strong>관리자 답변</strong>
                                <p>{report.answerContent || '담당자가 내용을 확인하고 있습니다.'}</p>
                                {report.processedAt && <time>{formatDate(report.processedAt)}</time>}
                            </section>
                        </article>
                    ))}
                </div>
            </div></section>
        </main>
    );
}

export default MyReportPage;
