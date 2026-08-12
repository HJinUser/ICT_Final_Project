import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { getMyConsultations } from '../api/myConsultationApi';
import type { MyConsultation } from '../types/Consultation';
import type { User } from '../types/User';
import '../assets/common.css';
import '../assets/responsive.css';

// 사용자 마이페이지
//
// 프로토타입(mypage.html)의 사용자 화면을 옮긴 것이다.
// "내 활동" 목록에서 알림내역을 누르면 상담 답변 화면(/my-consultations)으로 간다.
//
// 관심매물·비교 기록·평가내역은 아직 서버 기능이 없다.
// 숫자를 지어내면 실제로 되는 것과 구분이 안 되므로, 준비 중이라고 표시해 둔다.

interface Props {
    user: User | null;
}

// 매물 상세를 열면 PropertyPage 가 이 이름으로 localStorage 에 기록한다
const RECENT_VIEWED_KEY = 'recentlyViewedProperties';

function MyPage({ user }: Props) {
    const [consultations, setConsultations] = useState<MyConsultation[]>([]);
    const [recentViewedCount, setRecentViewedCount] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }

        getMyConsultations()
            .then((data) => setConsultations(data.content))
            .catch(() => setConsultations([]))
            .finally(() => setLoading(false));

        // 최근 본 매물은 서버가 아니라 브라우저에 저장된다
        try {
            const raw = localStorage.getItem(RECENT_VIEWED_KEY);
            setRecentViewedCount(raw ? JSON.parse(raw).length : 0);
        } catch {
            setRecentViewedCount(0);
        }
    }, [user]);

    if (!user) {
        return (
            <main>
                <section className="section"><div className="wrap">
                    <p className="dim">로그인이 필요한 화면입니다.</p>
                    <Link className="solid-btn" to="/member/login" style={{ marginTop: 14, display: 'inline-block' }}>
                        로그인하러 가기
                    </Link>
                </div></section>
            </main>
        );
    }

    // 아직 확인하지 않은 답변 = 읽지 않은 알림
    const unreadCount = consultations.filter((item) => item.reply && !item.replyChecked).length;

    return (
        <main>
            <section className="page-hero">
                <div className="wrap">
                    <div>
                        <div className="eyebrow">My Page</div>
                        <h1>마이페이지</h1>
                        <p>{user.name} 님의 활동 내역과 받은 답변을 확인하세요.</p>
                    </div>
                    <div className="hero-stat">
                        <span className="mono dim">읽지 않은 알림</span>
                        <strong>{unreadCount}건</strong>
                        <span className="xs dim">상담 답변 {consultations.length}건 중</span>

                        {/* 중개인·관리자는 자기 전용 화면이 따로 있다.
                            상담 답변 확인은 역할과 상관없는 기능이라 이 화면도 그대로 쓸 수 있게 두었다. */}
                        {user.role === 'BROKER' && (
                            <Link className="xs" to="/broker/mypage" style={{ display: 'block', marginTop: 8 }}>
                                중개인 마이페이지로 이동 →
                            </Link>
                        )}
                        {user.role === 'ADMIN' && (
                            <Link className="xs" to="/admin/properties" style={{ display: 'block', marginTop: 8 }}>
                                관리자 콘솔로 이동 →
                            </Link>
                        )}
                    </div>
                </div>
            </section>

            <section className="section">
                <div className="wrap">
                    {/* ── 지표 ─────────────────────────────────────── */}
                    <div className="metric-grid">
                        <div className="metric">
                            <span className="label">보낸 상담</span>
                            <strong>{loading ? '…' : consultations.length}</strong>
                            <span className="delta">답변 완료 {consultations.filter((item) => item.reply).length}건</span>
                        </div>
                        <div className="metric">
                            <span className="label">읽지 않은 알림</span>
                            <strong>{loading ? '…' : unreadCount}</strong>
                            <span className="delta">확인하지 않은 답변</span>
                        </div>
                        <div className="metric">
                            <span className="label">최근 본 매물</span>
                            <strong>{recentViewedCount}</strong>
                            <span className="delta">이 브라우저 기준</span>
                        </div>
                        <div className="metric">
                            <span className="label">관심매물</span>
                            <strong className="dim">–</strong>
                            <span className="delta">준비 중</span>
                        </div>
                    </div>

                    <div className="grid-2" style={{ marginTop: 24 }}>
                        {/* ── 내 활동 ───────────────────────────────── */}
                        <section className="card">
                            <div className="row between">
                                <h2>내 활동</h2>
                                <Link to="/my-consultations" className="outline-btn">전체 보기</Link>
                            </div>

                            <div className="side-nav" style={{ marginTop: 13 }}>
                                {/* 알림내역 : 받은 상담 답변을 확인하는 화면으로 간다 */}
                                <Link to="/my-consultations">
                                    알림내역 <span>{unreadCount}</span>
                                </Link>

                                <Link to="/agency">
                                    중개사무소 안내 <span>›</span>
                                </Link>

                                {/* 아래 두 가지는 아직 서버 기능이 없다 */}
                                <a className="dim" onClick={(event) => event.preventDefault()} href="#">
                                    관심매물 <span>준비 중</span>
                                </a>
                                <a className="dim" onClick={(event) => event.preventDefault()} href="#">
                                    비교 기록 <span>준비 중</span>
                                </a>
                            </div>
                        </section>

                        {/* ── 최근 받은 답변 ─────────────────────────── */}
                        <section className="card">
                            <div className="row between">
                                <h2>최근 받은 답변</h2>
                                {unreadCount > 0 && <span className="status orange">새 답변 {unreadCount}</span>}
                            </div>

                            {loading && <p className="xs dim" style={{ marginTop: 14 }}>불러오는 중입니다…</p>}

                            {!loading && consultations.filter((item) => item.reply).length === 0 && (
                                <p className="xs dim" style={{ marginTop: 14 }}>아직 받은 답변이 없습니다.</p>
                            )}

                            <div className="stack" style={{ marginTop: 14 }}>
                                {consultations
                                    .filter((item) => item.reply)
                                    .slice(0, 3)
                                    .map((consultation) => (
                                        <Link className="soft" to="/my-consultations" key={consultation.id}>
                                            <div className="row between">
                                                <strong className="xs">{consultation.agencyName}</strong>
                                                {!consultation.replyChecked && <span className="status orange">새 답변</span>}
                                            </div>
                                            <p className="xs dim" style={{ marginTop: 5 }}>
                                                {consultation.reply && consultation.reply.length > 50
                                                    ? `${consultation.reply.slice(0, 50)}…`
                                                    : consultation.reply}
                                            </p>
                                            <span className="xs dim">{consultation.repliedAt}</span>
                                        </Link>
                                    ))}
                            </div>
                        </section>
                    </div>
                </div>
            </section>
        </main>
    );
}

export default MyPage;
