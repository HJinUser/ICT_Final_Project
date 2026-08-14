/*
  메인 홈페이지 - 관리자 상세 블록 (공통 콘텐츠 뒤, 맨 아래 CTA 앞).

  요약 스트립(HomeAdminSummary)이 건수를 보여 준다면 여기서는 무엇이 밀려 있는지를 보여 준다.
  승인·반려·신고 처리 버튼은 두지 않고, 항목을 누르면 관리자 콘솔의 해당 화면으로 보낸다.

  화면정의서의 "문의 내역"은 관리자 문의 도메인이 아직 없어 자리만 잡아 둔다.
  (지금 있는 상담(consultation)은 사용자 - 중개인 사이의 것이라 성격이 다르다.)
*/

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { getAdminProperties } from '../api/adminApi';
import { getReports } from '../api/reportApi';
import type { AdminProperty } from '../types/Admin';
import { REPORT_TARGET_LABELS, type Report } from '../types/Report';

const PROPERTY_COUNT = 3;
const REPORT_COUNT = 5;

function HomeAdminDetail() {
    const navigate = useNavigate();

    const [properties, setProperties] = useState<AdminProperty[]>([]);
    const [propertyError, setPropertyError] = useState('');

    const [reports, setReports] = useState<Report[]>([]);
    const [reportError, setReportError] = useState('');

    useEffect(() => {
        getAdminProperties('PENDING', 0)
            .then((data) => {
                setProperties(data.content.slice(0, PROPERTY_COUNT));
                setPropertyError('');
            })
            .catch((err) => {
                console.error('승인 대기 매물을 불러오지 못했습니다.', err);
                setProperties([]);
                setPropertyError('승인 대기 매물을 불러오지 못했습니다.');
            });

        getReports({ status: 'PENDING' })
            .then((data) => {
                setReports(data.slice(0, REPORT_COUNT));
                setReportError('');
            })
            .catch((err) => {
                console.error('신고 목록을 불러오지 못했습니다.', err);
                setReports([]);
                setReportError('신고 목록을 불러오지 못했습니다.');
            });
    }, []);

    return (
        <section className="home-sec alt">
            <div className="rv-wrap">
                <div className="home-shead">
                    <div>
                        <h2>밀려 있는 항목</h2>
                        <p>항목을 누르면 관리자 콘솔의 처리 화면으로 이동합니다.</p>
                    </div>
                </div>

                {/* 승인 대기 매물 */}
                <div className="row between" style={{ alignItems: 'baseline', marginBottom: 14 }}>
                    <h3 style={{ fontSize: 17 }}>승인 대기 매물</h3>
                    <button
                        onClick={() => navigate('/admin/properties')}
                        style={{ fontSize: 13, color: 'var(--v)' }}
                    >
                        전체 보기
                    </button>
                </div>

                {propertyError && (
                    <p className="xs" style={{ color: 'var(--sig-high)' }}>{propertyError}</p>
                )}

                {!propertyError && properties.length === 0 && (
                    <p className="xs dim">승인을 기다리는 매물이 없습니다.</p>
                )}

                {properties.length > 0 && (
                    <div className="grid-3">
                        {properties.map((property) => (
                            <button
                                key={property.id}
                                className="card home-adcard"
                                onClick={() => navigate('/admin/properties')}
                            >
                                <div className="row between" style={{ alignItems: 'baseline' }}>
                                    <strong>{property.name}</strong>
                                    <span className="status orange">{property.statusLabel}</span>
                                </div>
                                <div style={{ marginTop: 8, fontSize: 17, fontWeight: 700 }}>
                                    {property.priceLabel}
                                </div>
                                <p className="xs dim" style={{ marginTop: 6 }}>
                                    {property.typeLabel} · {property.address}
                                </p>
                                <p className="xs dim" style={{ marginTop: 4 }}>
                                    {property.agencyName ?? '사무소 미지정'} · 등록 {property.createdAt}
                                </p>
                            </button>
                        ))}
                    </div>
                )}

                {/* 최근 신고 */}
                <div
                    className="row between"
                    style={{ alignItems: 'baseline', margin: '30px 0 14px' }}
                >
                    <h3 style={{ fontSize: 17 }}>최근 신고</h3>
                    <button
                        onClick={() => navigate('/admin/reports')}
                        style={{ fontSize: 13, color: 'var(--v)' }}
                    >
                        신고 관리로 이동
                    </button>
                </div>

                <div className="card">
                    {reportError && (
                        <p className="xs" style={{ color: 'var(--sig-high)' }}>{reportError}</p>
                    )}

                    {!reportError && reports.length === 0 && (
                        <p className="xs dim">미처리 신고가 없습니다.</p>
                    )}

                    {reports.length > 0 && (
                        <ul className="home-minilist">
                            {reports.map((report) => (
                                <li key={report.id}>
                                    <button onClick={() => navigate(`/admin/reports/${report.id}`)}>
                                        <span className="ttl">{report.title}</span>
                                        <span className="rv-xs rv-dim sub">
                                            {report.reporterName} · {report.createdAt?.slice(0, 10)}
                                        </span>
                                        <span className="status red">{REPORT_TARGET_LABELS[report.targetType]}</span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* 관리자 문의 도메인이 아직 없다. 자리만 잡아 둔다. */}
                <div className="home-prep wide" style={{ marginTop: 18 }}>
                    <span className="badge">준비 중</span>
                    <strong>문의 내역</strong>
                    <p>
                        사용자·중개인이 관리자에게 보낸 문의 최근 5건과 접수 중·답변 완료 건수가
                        이 자리에 들어갑니다.
                    </p>
                </div>
            </div>
        </section>
    );
}

export default HomeAdminDetail;
