import { useEffect, useMemo, useState } from 'react';

import { getPublicReports } from '../api/reportApi';
import {
    REPORT_STATUS_LABELS,
    REPORT_TARGET_LABELS,
    type PublicReport,
    type ReportStatus,
} from '../types/Report';
import '../styles/MyReportPage.css';

function formatDate(value: string | null) {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';

    return new Intl.DateTimeFormat('ko-KR', {
        year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(date);
}

function MyReportPage() {
    const [reports, setReports] = useState<PublicReport[]>([]);
    const [status, setStatus] = useState<ReportStatus | 'ALL'>('ALL');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let active = true;

        const loadReports = async () => {
            try {
                const data = await getPublicReports();
                if (active) setReports(data);
            } catch (requestError) {
                console.error('공개 신고 처리 내역 조회 실패', requestError);
                if (active) setError('신고 처리 내역을 불러오지 못했습니다.');
            } finally {
                if (active) setLoading(false);
            }
        };

        loadReports();
        return () => { active = false; };
    }, []);

    const filteredReports = useMemo(
        () => status === 'ALL' ? reports : reports.filter((report) => report.status === status),
        [reports, status],
    );

    return (
        <main className="report-page-bg">
            <section className="page-hero report-hero"><div className="wrap">
                <div>
                    <div className="eyebrow">Report history</div>
                    <h1>신고 처리 내역</h1>
                    <p>신고 내용은 비공개로 보호하고 처리 상태만 공개합니다.</p>
                </div>
                <div className="hero-stat">
                    <span className="mono dim">전체 내역</span>
                    <strong>{reports.length}건</strong>
                    <span className="xs dim">최신 접수순</span>
                </div>
            </div></section>
            <section className="section"><div className="wrap report-list-wrap">
                <div className="report-filter-row">
                    <div className="chip-group">
                        {(['ALL', 'PENDING', 'RESOLVED', 'REJECTED'] as const).map((item) => (
                            <button
                                className={`filter-chip${status === item ? ' on' : ''}`}
                                type="button"
                                onClick={() => setStatus(item)}
                                key={item}
                            >
                                {item === 'ALL' ? '전체' : REPORT_STATUS_LABELS[item]}
                            </button>
                        ))}
                    </div>
                </div>
                {loading && <div className="report-state">신고 처리 내역을 불러오는 중입니다.</div>}
                {!loading && error && <div className="report-state report-error">{error}</div>}
                {!loading && !error && filteredReports.length === 0 && <div className="report-state">공개할 신고 처리 내역이 없습니다.</div>}
                <div className="report-card-list">
                    {filteredReports.map((report) => (
                        <article className="report-card" key={report.id}>
                            <header>
                                <div className="report-card-title">
                                    <span className={`status ${report.status === 'RESOLVED' ? 'green' : report.status === 'REJECTED' ? 'red' : 'orange'}`}>
                                        {REPORT_STATUS_LABELS[report.status]}
                                    </span>
                                    <h2>{REPORT_TARGET_LABELS[report.targetType]} 신고 #{report.id}</h2>
                                </div>
                                <time>{formatDate(report.createdAt)}</time>
                            </header>
                            <p className="report-public-note">
                                {report.status === 'PENDING' && '관리자가 신고 내용을 검토하고 있습니다.'}
                                {report.status === 'RESOLVED' && `검토 결과 서비스에 반영되었습니다. · ${formatDate(report.processedAt)}`}
                                {report.status === 'REJECTED' && `검토 결과 취소 처리되었습니다. · ${formatDate(report.processedAt)}`}
                            </p>
                        </article>
                    ))}
                </div>
            </div></section>
        </main>
    );
}

export default MyReportPage;
