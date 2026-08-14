/*
  메인 홈페이지 - 관리자 요약 스트립 (히어로 바로 아래).

  관리자 콘솔(/admin)과 역할을 나눈다.
  메인은 "몇 건 남았는지"만 알려 주고, 승인·심사 같은 실제 처리는 콘솔에서 한다.
  (같은 조작 버튼을 두 곳에 두면 실수로 승인하는 경로가 늘어난다.)

  화면정의서의 회원 통계(총 회원 수·신규 가입·역할 비중)는 집계 API가 아직 없어
  자리만 잡아 두고 준비 중으로 표시한다.
*/

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { getAdminBrokers, getAdminProperties } from '../api/adminApi';
import { getReports } from '../api/reportApi';

function HomeAdminSummary() {
    const navigate = useNavigate();

    // 불러오지 못한 항목은 숫자를 지어내지 않고 null로 두어 "–"로 표시한다.
    const [pendingProperties, setPendingProperties] = useState<number | null>(null);
    const [pendingBrokers, setPendingBrokers] = useState<number | null>(null);
    const [pendingReports, setPendingReports] = useState<number | null>(null);
    const [error, setError] = useState('');

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
    }, []);

    const total = (pendingProperties ?? 0) + (pendingBrokers ?? 0) + (pendingReports ?? 0);

    return (
        <section className="home-sec tight">
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

                {/* 집계 API가 아직 없는 항목. 자리만 잡아 둔다. */}
                <div className="home-prep wide" style={{ marginTop: 16 }}>
                    <span className="badge">준비 중</span>
                    <strong>회원 통계</strong>
                    <p>
                        총 회원 수, 신규 가입자, 정지 회원, 가입 추이 선 그래프와
                        사용자·중개인 비중 도넛 차트가 이 자리에 들어갑니다.
                    </p>
                </div>
            </div>
        </section>
    );
}

export default HomeAdminSummary;
