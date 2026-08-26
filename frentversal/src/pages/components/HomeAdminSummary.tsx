/*
  메인 홈페이지 - 관리자 요약 스트립 (히어로 바로 아래).

  관리자 콘솔(/admin)과 역할을 나눈다.
  메인은 "몇 건 남았는지"만 알려 주고, 승인·심사 같은 실제 처리는 콘솔에서 한다.
  (같은 조작 버튼을 두 곳에 두면 실수로 승인하는 경로가 늘어난다.)

  회원 통계(GET /admin/members/stats)는 있는 자료만 보여 준다.
  화면정의서의 "정지 회원"은 회원 엔터티에 정지 여부 컬럼 자체가 없어 지금은 뺐다.
  차트는 다른 화면(AI 시세예측 등)의 그라데이션 막대와 구분되게 전부 단색으로 그린다.
*/

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { getAdminBrokers, getAdminProperties, getMemberStats } from '../../api/adminApi';
import { getReports } from '../../api/reportApi';
import type { MemberStats } from '../../types/Admin';

// 역할 비중 막대의 단색. 다른 화면의 그라데이션 막대와 구분한다.
const ROLE_COLORS: Record<string, string> = {
    USER: 'var(--v)',
    BROKER: 'var(--teal)',
    ADMIN: 'var(--orange)',
};

interface Props {
    // 섹션 목차(HomeSectionNav)가 이 구역으로 스크롤·강조할 수 있도록 붙이는 앵커.
    id: string;
}

function HomeAdminSummary({ id }: Props) {
    const navigate = useNavigate();

    // 불러오지 못한 항목은 숫자를 지어내지 않고 null로 두어 "–"로 표시한다.
    const [pendingProperties, setPendingProperties] = useState<number | null>(null);
    const [pendingBrokers, setPendingBrokers] = useState<number | null>(null);
    const [pendingReports, setPendingReports] = useState<number | null>(null);
    const [error, setError] = useState('');

    const [memberStats, setMemberStats] = useState<MemberStats | null>(null);
    const [memberStatsError, setMemberStatsError] = useState('');

    useEffect(() => {
        getAdminProperties('PENDING', 0)
            .then((data) => setPendingProperties(data.pendingCount))
            .catch((err) => {
                console.error('승인 대기 매물 건수를 불러오지 못했습니다.', err);
                setPendingProperties(null);
                setError('일부 항목을 불러오지 못했습니다.');
            });

        getAdminBrokers('PENDING', 0)
            .then((data) => setPendingBrokers(data.pendingCount))
            .catch((err) => {
                console.error('심사 대기 중개인 건수를 불러오지 못했습니다.', err);
                setPendingBrokers(null);
                setError('일부 항목을 불러오지 못했습니다.');
            });

        getReports({ status: 'PENDING' })
            .then((data) => setPendingReports(data.length))
            .catch((err) => {
                console.error('미처리 신고 건수를 불러오지 못했습니다.', err);
                setPendingReports(null);
                setError('일부 항목을 불러오지 못했습니다.');
            });

        getMemberStats()
            .then((data) => {
                setMemberStats(data);
                setMemberStatsError('');
            })
            .catch((err) => {
                console.error('회원 통계를 불러오지 못했습니다.', err);
                setMemberStats(null);
                setMemberStatsError('회원 통계를 불러오지 못했습니다.');
            });
    }, []);

    // 가입 추이 막대 높이를 정할 기준값. 값이 하나도 없어도 0 으로 나누지 않도록 최소 1 로 둔다.
    const trendMax = Math.max(1, ...(memberStats?.trend.map((item) => item.count) ?? [0]));

    // 역할 비중 막대에 쓸 전체 합계. 0이면 나눗셈을 하지 않고 빈 막대로 둔다.
    const roleTotal = memberStats?.roleCounts.reduce((sum, item) => sum + item.count, 0) ?? 0;

    const total = (pendingProperties ?? 0) + (pendingBrokers ?? 0) + (pendingReports ?? 0);

    return (
        <section className="home-sec tight" id={id}>
            <div className="rv-wrap">
                <div className="home-shead">
                    <div>
                        <h2>오늘 처리할 일</h2>
                        <p>승인과 심사를 기다리는 항목입니다. 처리는 관리자 콘솔에서 합니다.</p>
                    </div>
                    <button className="outline-btn" onClick={() => navigate('/admin')}>
                        관리자 콘솔 열기
                    </button>
                </div>

                {error && (
                    <p className="xs" style={{ marginBottom: 12, color: 'var(--sig-high)' }}>{error}</p>
                )}

                <div className="metric-grid">
                    <div className="metric">
                        <span className="label">승인 대기 매물</span>
                        <strong>{pendingProperties ?? '–'}</strong>
                        <span className="delta">승인해야 지도에 노출</span>
                    </div>
                    <div className="metric">
                        <span className="label">심사 대기 중개인</span>
                        <strong>{pendingBrokers ?? '–'}</strong>
                        <span className="delta">승인 시 인증 마크 발급</span>
                    </div>
                    <div className="metric">
                        <span className="label">미처리 신고</span>
                        <strong>{pendingReports ?? '–'}</strong>
                        <span className="delta">허위 매물·한줄평</span>
                    </div>
                    <div className="metric">
                        <span className="label">대기 합계</span>
                        <strong>{total}</strong>
                        <span className="delta">{total > 0 ? '처리가 필요합니다' : '남은 항목 없음'}</span>
                    </div>
                </div>

                {/* 회원 통계. 정지 회원은 그 여부를 저장하는 컬럼이 없어 지금은 뺐다. */}
                <div className="card home-member-stats" style={{ marginTop: 16 }}>
                    <div className="row between" style={{ alignItems: 'baseline' }}>
                        <h3 style={{ fontSize: 17 }}>회원 통계</h3>
                        <span className="xs dim">
                            전체 {memberStats?.totalCount ?? '–'}명 · 이번 달 신규 {memberStats?.newThisMonth ?? '–'}명
                        </span>
                    </div>

                    {memberStatsError && (
                        <p className="xs" style={{ marginTop: 14, color: 'var(--sig-high)' }}>{memberStatsError}</p>
                    )}

                    {!memberStatsError && !memberStats && (
                        <p className="xs dim" style={{ marginTop: 14 }}>불러오는 중입니다…</p>
                    )}

                    {memberStats && (
                        <div className="home-member-stats-grid">
                            {/* 가입 추이 : 단색 막대 그래프 */}
                            <div>
                                <p className="xs dim">가입 추이 (최근 {memberStats.trendMonths}개월)</p>

                                <div className="home-signup-trend">
                                    {memberStats.trend.map((item) => (
                                        <div className="home-signup-col" key={item.month}>
                                            <span className="home-signup-value">{item.count}</span>

                                            <div
                                                className="home-signup-bar"
                                                style={{ height: `${(item.count / trendMax) * 96}px` }}
                                                title={`${item.label} · 신규 가입 ${item.count}명`}
                                            />

                                            <span className="xs home-signup-label">{item.label}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* 역할 비중 : 단색 구간 막대 */}
                            <div>
                                <p className="xs dim">역할 비중</p>

                                <div className="home-role-bar">
                                    {roleTotal > 0 && memberStats.roleCounts
                                        .filter((item) => item.count > 0)
                                        .map((item) => (
                                            <span
                                                key={item.role}
                                                style={{
                                                    width: `${(item.count / roleTotal) * 100}%`,
                                                    background: ROLE_COLORS[item.role] ?? 'var(--ink-3)',
                                                }}
                                                title={`${item.roleLabel} ${item.count}명`}
                                            />
                                        ))}
                                </div>

                                <ul className="home-role-legend">
                                    {memberStats.roleCounts.map((item) => (
                                        <li key={item.role}>
                                            <i style={{ background: ROLE_COLORS[item.role] ?? 'var(--ink-3)' }} />
                                            {item.roleLabel} <strong>{item.count}</strong>
                                            {roleTotal > 0 && (
                                                <span className="rv-dim">
                                                    {' '}· {Math.round((item.count / roleTotal) * 100)}%
                                                </span>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}

export default HomeAdminSummary;
