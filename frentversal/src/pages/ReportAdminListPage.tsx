import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { getReports } from '../api/reportApi';
import type { Report, ReportStatus, ReportTargetType } from '../types/Report';
import type { User } from '../types/User';
import '../assets/common.css';
import '../assets/responsive.css';
import '../components/Report.css';

interface ReportAdminListPageProps {
    user: User | null;
}

const STATUS_LABELS: Record<ReportStatus, string> = { PENDING: '처리 대기', RESOLVED: '처리 완료', REJECTED: '반려' };

function formatDate(value: string) {
    return new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value));
}

function ReportAdminListPage({ user }: ReportAdminListPageProps) {
    const [reports, setReports] = useState<Report[]>([]);
    const [status, setStatus] = useState<ReportStatus>('PENDING');
    const [targetType, setTargetType] = useState<ReportTargetType | ''>('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let active = true;
        const loadReports = async () => {
            setLoading(true);
            setError('');
            try {
                const data = await getReports({ status, targetType: targetType || undefined });
                if (active) setReports(data);
            } catch (requestError) {
                console.error('관리자 신고 목록 조회 실패', requestError);
                if (active) setError('신고 목록을 불러오지 못했습니다.');
            } finally {
                if (active) setLoading(false);
            }
        };
        if (user?.role === 'ADMIN') loadReports();
        return () => { active = false; };
    }, [status, targetType, user]);

    if (user?.role !== 'ADMIN') {
        return <main className="report-page-bg"><section className="section"><div className="wrap report-narrow"><div className="report-state report-error">관리자만 접근할 수 있습니다.</div></div></section></main>;
    }

    return (
        <main className="report-page-bg">
            <section className="page-hero report-hero"><div className="wrap">
                <div><div className="eyebrow">Admin</div><h1>신고 관리</h1><p>접수된 신고를 확인하고 처리 결과와 답변을 등록합니다.</p></div>
                <div className="hero-stat"><span className="mono dim">현재 조회 결과</span><strong>{reports.length}건</strong><span className="xs dim">{STATUS_LABELS[status]}</span></div>
            </div></section>
            <section className="section"><div className="wrap report-admin-wrap">
                <div className="report-admin-toolbar">
                    <div className="tabs report-tabs">
                        {(['PENDING', 'RESOLVED', 'REJECTED'] as const).map((item) => (
                            <button className={`tab-btn${status === item ? ' on' : ''}`} type="button" onClick={() => setStatus(item)} key={item}>{STATUS_LABELS[item]}</button>
                        ))}
                    </div>
                    <select className="search-box" value={targetType} onChange={(event) => setTargetType(event.target.value as ReportTargetType | '')}>
                        <option value="">대상 전체</option>
                        <option value="PROPERTY">매물 신고</option>
                        <option value="REVIEW">리뷰 신고</option>
                    </select>
                </div>
                {loading && <div className="report-state">신고 목록을 불러오는 중입니다.</div>}
                {!loading && error && <div className="report-state report-error">{error}</div>}
                {!loading && !error && reports.length === 0 && <div className="report-state">조건에 맞는 신고가 없습니다.</div>}
                {!loading && !error && reports.length > 0 && (
                    <div className="table-wrap report-table-wrap"><table className="report-table"><thead><tr>
                        <th>번호</th><th>대상</th><th>제목</th><th>신고자</th><th>접수일</th><th>상태</th>
                    </tr></thead><tbody>
                        {reports.map((report) => <tr key={report.id}>
                            <td>{report.id}</td>
                            <td>{report.targetType === 'PROPERTY' ? '매물' : '리뷰'} #{report.targetId}</td>
                            <td><Link className="report-table-link" to={`/admin/reports/${report.id}`}>{report.title}</Link></td>
                            <td>{report.reporterName}</td>
                            <td>{formatDate(report.createdAt)}</td>
                            <td><span className={`status ${report.status === 'RESOLVED' ? 'green' : report.status === 'REJECTED' ? 'red' : 'orange'}`}>{STATUS_LABELS[report.status]}</span></td>
                        </tr>)}
                    </tbody></table></div>
                )}
            </div></section>
        </main>
    );
}

export default ReportAdminListPage;
