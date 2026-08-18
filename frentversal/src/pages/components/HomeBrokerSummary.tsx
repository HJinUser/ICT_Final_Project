/*
  메인 홈페이지 - 중개인 요약 스트립 (히어로 바로 아래).

  중개인에게는 집을 "찾는" 화면보다 자기 매물 현황이 먼저 필요하다.
  여기에는 숫자만 두고, 목록 형태의 상세는 공통 콘텐츠 뒤(HomeBrokerDetail)에 둔다.

  값은 모두 /my-agency/dashboard 응답에서 그대로 온다. 지어낸 숫자는 쓰지 않는다.
*/

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { getDashboard } from '../../api/myAgencyApi';
import type { MyAgencyDashboard } from '../../types/MyAgency';
import type { User } from '../../types/User';

// 도넛 조각. 순서와 색을 한 곳에서 관리해 범례와 그래프가 어긋나지 않게 한다.
const SEGMENTS: { key: keyof MyAgencyDashboard; label: string; color: string }[] = [
    { key: 'activeCount', label: '게시중', color: '#4B0082' },
    { key: 'inProgressCount', label: '거래 진행중', color: '#8257B5' },
    { key: 'completedCount', label: '거래 완료', color: '#2E6F52' },
    { key: 'pendingCount', label: '승인 대기', color: '#C9A227' },
];

interface Props {
    user: User;
}

function HomeBrokerSummary({ user }: Props) {
    const navigate = useNavigate();

    const [dashboard, setDashboard] = useState<MyAgencyDashboard | null>(null);
    const [error, setError] = useState('');

    useEffect(() => {
        getDashboard()
            .then((data) => {
                setDashboard(data);
                setError('');
            })
            .catch((err) => {
                // 사무소를 아직 등록하지 않은 중개인은 조회 자체가 실패한다.
                // 메인 화면 전체를 막을 일은 아니라서 이 영역만 안내로 바꾼다.
                console.error('중개인 대시보드를 불러오지 못했습니다.', err);
                setDashboard(null);
                setError('중개사무소 정보가 아직 없거나 현황을 불러오지 못했습니다.');
            });
    }, []);

    if (error) {
        return (
            <section className="home-sec tight">
                <div className="rv-wrap">
                    <div className="soft">
                        <strong>{user.name} 공인중개사님, 매물 현황을 보여드리지 못했습니다.</strong>
                        <p className="xs dim" style={{ marginTop: 6 }}>{error}</p>
                        <button
                            className="outline-btn"
                            style={{ marginTop: 12 }}
                            onClick={() => navigate('/broker/agency')}
                        >
                            중개사무소 등록하러 가기
                        </button>
                    </div>
                </div>
            </section>
        );
    }

    if (!dashboard) {
        return null;
    }

    // 도넛은 매물 상태의 비중을 보는 것이라, 상태 4가지의 합을 분모로 쓴다.
    const donutTotal = SEGMENTS.reduce((sum, seg) => sum + (dashboard[seg.key] as number), 0);

    // conic-gradient는 각 조각의 시작·끝 각도를 직접 적어 줘야 한다.
    let cursor = 0;
    const slices = SEGMENTS.map((seg) => {
        const value = dashboard[seg.key] as number;
        const start = cursor;
        const end = donutTotal > 0 ? start + (value / donutTotal) * 360 : start;
        cursor = end;

        return `${seg.color} ${start}deg ${end}deg`;
    });

    // 매물이 하나도 없으면 회색 원만 그린다
    const donutBackground = donutTotal > 0
        ? `conic-gradient(${slices.join(', ')})`
        : 'conic-gradient(var(--line) 0deg 360deg)';

    return (
        <section className="home-sec tight">
            <div className="rv-wrap">
                <div className="home-shead">
                    <div>
                        <h2>{user.name} 공인중개사님, 오늘 매물 현황입니다</h2>
                        <p>등록한 매물의 상태를 한눈에 확인하세요.</p>
                    </div>
                    <button className="outline-btn" onClick={() => navigate('/broker/mypage')}>
                        매물 관리로 이동
                    </button>
                </div>

                <div className="home-summary">
                    <div className="metric-grid two">
                        <div className="metric">
                            <span className="label">등록 매물 수</span>
                            <strong>{dashboard.totalCount}</strong>
                            <span className="delta">지금까지 올린 전체</span>
                        </div>
                        <div className="metric">
                            <span className="label">승인 대기</span>
                            <strong>{dashboard.pendingCount}</strong>
                            <span className="delta">관리자 확인 후 노출</span>
                        </div>
                        <div className="metric">
                            <span className="label">노출 중인 매물</span>
                            <strong>{dashboard.activeCount}</strong>
                            <span className="delta">지도·검색에 보이는 중</span>
                        </div>
                        <div className="metric">
                            <span className="label">답변 안 한 상담</span>
                            <strong>{dashboard.requestedConsultationCount}</strong>
                            <span className="delta">미답변 리뷰 {dashboard.unansweredReviewCount}건</span>
                        </div>
                    </div>

                    <div className="home-donutcard">
                        <span className="rv-xs rv-dim">매물 기록</span>

                        <div className="home-donutrow">
                            <div className="home-donut" style={{ background: donutBackground }}>
                                <div className="hole">
                                    <strong className="rv-num">{donutTotal}</strong>
                                    <span className="rv-xs rv-dim">건</span>
                                </div>
                            </div>

                            <ul className="home-legend">
                                {SEGMENTS.map((seg) => (
                                    <li key={seg.key}>
                                        <span className="dot" style={{ background: seg.color }} />
                                        <span className="name">{seg.label}</span>
                                        <span className="rv-num val">{dashboard[seg.key] as number}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

export default HomeBrokerSummary;
