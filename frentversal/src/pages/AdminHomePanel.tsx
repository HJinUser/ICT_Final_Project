import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { getAdminBrokers, getAdminProperties } from '../api/adminApi';

// 관리자 콘솔에 처음 들어왔을 때 보이는 화면 (/admin).
//
// 프로토타입의 대시보드(가입 추이·회원 통계 그래프)는 아직 만들 수 없어서,
// 지금 실제로 처리할 수 있는 일이 몇 건 남았는지만 보여 주고 각 화면으로 보낸다.
// 숫자를 지어내면 되는 것과 안 되는 것이 구분되지 않으므로 실제 값만 쓴다.

function AdminHomePanel() {
    const [pendingProperties, setPendingProperties] = useState<number | null>(null);
    const [pendingBrokers, setPendingBrokers] = useState<number | null>(null);

    useEffect(() => {
        // 목록 응답에 대기 건수가 함께 담겨 온다
        getAdminProperties('PENDING', 0)
            .then((data) => setPendingProperties(data.pendingCount))
            .catch(() => setPendingProperties(null));

        getAdminBrokers('PENDING', 0)
            .then((data) => setPendingBrokers(data.pendingCount))
            .catch(() => setPendingBrokers(null));
    }, []);

    const total = (pendingProperties ?? 0) + (pendingBrokers ?? 0);

    return (
        <>
            <div className="section-head">
                <div>
                    <h2>오늘 처리할 일</h2>
                    <p>승인과 심사를 기다리는 항목입니다.</p>
                </div>
                <span className={`status ${total > 0 ? 'orange' : 'green'}`}>
                    {total > 0 ? `대기 ${total}건` : '대기 없음'}
                </span>
            </div>

            <div className="grid-2">
                <Link className="card" to="/admin/properties">
                    <span className="xs dim">승인 대기 매물</span>
                    <strong className="num" style={{ display: 'block', marginTop: 6, fontSize: 26 }}>
                        {pendingProperties ?? '–'}
                    </strong>
                    <p className="xs dim" style={{ marginTop: 6 }}>
                        승인 후 지도와 중개사무소 화면에 노출됩니다.
                    </p>
                </Link>

                <Link className="card" to="/admin/brokers">
                    <span className="xs dim">심사 대기 인증 신청</span>
                    <strong className="num" style={{ display: 'block', marginTop: 6, fontSize: 26 }}>
                        {pendingBrokers ?? '–'}
                    </strong>
                    <p className="xs dim" style={{ marginTop: 6 }}>
                        승인 후 중개사무소에 인증 마크가 발급됩니다.
                    </p>
                </Link>
            </div>

            <div className="soft" style={{ marginTop: 26 }}>
                <strong>아직 준비 중인 메뉴</strong>
                <p className="xs dim" style={{ marginTop: 6 }}>
                    대시보드(통계), 회원 관리, 데이터 수집·배치 모니터링, 모델 관리는 화면이 만들어지면
                    왼쪽 메뉴에서 바로 열립니다.
                </p>
            </div>
        </>
    );
}

export default AdminHomePanel;
