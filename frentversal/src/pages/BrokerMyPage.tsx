import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { getConsultations, getDashboard } from '../api/myAgencyApi';
import { getMyVerification } from '../api/brokerApi';
import type { Consultation, MyAgencyDashboard, BrokerVerification } from '../types/MyAgency';
import type { User } from '../types/User';
import { CONSULTATION_FILTERS, CONSULTATION_STATUS_COLORS } from '../utils/consultationStatus';
import '../assets/common.css';
import '../assets/responsive.css';

// 중개인으로 로그인했을 때 보이는 마이페이지
//
// 구성 : 대시보드(매물 현황) → 문의 관리(필터 + 목록) → 바로가기 카드들
// 문의를 클릭하면 "답변하기" 페이지(/broker/consultations/:id)로 이동한다.

interface Props {
    user: User | null;
}


function BrokerMyPage({ user }: Props) {
    const navigate = useNavigate();

    const [dashboard, setDashboard] = useState<MyAgencyDashboard | null>(null);
    const [consultations, setConsultations] = useState<Consultation[]>([]);
    const [verification, setVerification] = useState<BrokerVerification | null>(null);

    const [filter, setFilter] = useState('ALL');
    const [loading, setLoading] = useState(true);

    // 사무소가 아직 없을 때(인증 전) 서버가 주는 안내 메시지를 담아 둔다
    const [notice, setNotice] = useState('');

    // 중개인이 아니면 이 화면을 볼 이유가 없으므로 홈으로 보낸다.
    // 서버에서도 /my-agency/** 를 중개인만 통과시키므로 화면 처리는 안내 목적이다.
    useEffect(() => {
        if (user && user.role !== 'BROKER') {
            navigate('/');
        }
    }, [user, navigate]);

    // 대시보드와 인증 상태는 화면에 들어올 때 한 번만 불러온다
    useEffect(() => {
        const load = async () => {
            setLoading(true);

            try {
                const [dashboardData, verificationData] = await Promise.all([
                    getDashboard(),
                    getMyVerification(),
                ]);

                setDashboard(dashboardData);
                setVerification(verificationData);
                setNotice('');
            } catch (error: any) {
                // 사무소가 아직 없으면 404 와 함께 안내 메시지가 온다
                setNotice(error.response?.data?.message ?? '정보를 불러오지 못했습니다.');

                // 사무소가 없어도 인증 상태는 볼 수 있어야 한다
                try {
                    setVerification(await getMyVerification());
                } catch {
                    setVerification(null);
                }
            } finally {
                setLoading(false);
            }
        };

        load();
    }, []);

    // 문의 목록은 필터가 바뀔 때마다 다시 불러온다
    //테스트
    useEffect(() => {
        getConsultations(filter)
            .then(setConsultations)
            .catch(() => setConsultations([]));
    }, [filter]);

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

    return (
        <main>
            <section className="page-hero">
                <div className="wrap">
                    <div>
                        <div className="eyebrow">중개인 마이페이지</div>
                        <h1>{user.name} 공인중개사</h1>
                        <p>등록한 매물과 들어온 문의를 한 곳에서 관리하세요.</p>
                    </div>
                    <div className="hero-stat">
                        <span className="mono dim">상담 요청</span>
                        <strong>{dashboard?.requestedConsultationCount ?? 0}건</strong>
                        <span className="xs dim">
                            미답변 리뷰 {dashboard?.unansweredReviewCount ?? 0}건 · 평점 ★ {(dashboard?.ratingAvg ?? 0).toFixed(1)}
                        </span>
                    </div>
                </div>
            </section>

            <section className="section">
                <div className="wrap">
                    {notice && (
                        <div className="soft" style={{ marginBottom: 22 }}>
                            <strong>{notice}</strong>
                            <p className="xs dim" style={{ marginTop: 5 }}>
                                중개사무소 인증을 마치면 매물과 문의를 관리할 수 있습니다.
                            </p>
                        </div>
                    )}

                    {/* ── 대시보드 : 매물이 거치는 4단계를 순서대로 배치 ──────
                        새로 등록한 매물은 "승인 대기"로 시작한다. 이 칸이 없으면
                        등록 직후 네 숫자가 모두 0으로 보여서 등록이 안 된 것처럼 보인다. */}
                    <h2>대시보드</h2>
                    <div className="grid-4" style={{ marginTop: 16 }}>
                        <div className="card">
                            <span className="xs dim">승인 대기</span>
                            <strong className="num" style={{ display: 'block', marginTop: 6, fontSize: 26 }}>
                                {dashboard?.pendingCount ?? 0}
                            </strong>
                            <span className="xs dim">관리자 승인 후 노출됩니다.</span>
                        </div>
                        <div className="card">
                            <span className="xs dim">게시 중 매물</span>
                            <strong className="num" style={{ display: 'block', marginTop: 6, fontSize: 26 }}>
                                {dashboard?.activeCount ?? 0}
                            </strong>
                        </div>
                        <div className="card">
                            <span className="xs dim">거래 진행 중</span>
                            <strong className="num" style={{ display: 'block', marginTop: 6, fontSize: 26 }}>
                                {dashboard?.inProgressCount ?? 0}
                            </strong>
                        </div>
                        <div className="card">
                            <span className="xs dim">거래 완료</span>
                            <strong className="num" style={{ display: 'block', marginTop: 6, fontSize: 26 }}>
                                {dashboard?.completedCount ?? 0}
                            </strong>
                        </div>
                    </div>

                    {/* ── 바로가기 카드 ──────────────────────────────── */}
                    <div className="section-head" style={{ marginTop: 48 }}>
                        <div>
                            <h2>바로가기</h2>
                            <p>자주 쓰는 기능으로 바로 이동합니다.</p>
                        </div>
                    </div>

                    <div className="grid-4">
                        <Link className="card" to="/property/form">
                            <h3>매물 등록</h3>
                            <p className="xs dim" style={{ marginTop: 6 }}>새 매물을 등록합니다.</p>
                        </Link>

                        <Link className="card" to="/broker/properties">
                            <h3>내 매물 관리</h3>
                            <p className="xs dim" style={{ marginTop: 6 }}>등록한 매물을 수정하고 상태를 관리합니다.</p>
                        </Link>

                        <Link className="card" to="/broker/agency">
                            <h3>내 중개사무소</h3>
                            <p className="xs dim" style={{ marginTop: 6 }}>등록 매물·상담 내역·평점을 확인합니다.</p>
                        </Link>

                        <Link className="card" to="/broker/agency?mode=edit">
                            <h3>중개사무소 관리</h3>
                            <p className="xs dim" style={{ marginTop: 6 }}>사무소 정보를 수정합니다.</p>
                        </Link>

                        {/* 인증 상태에 따라 안내 문구가 달라진다 */}
                        <Link className="card" to="/broker/verification">
                            <div className="row between">
                                <h3>내 중개사무소 인증 받기</h3>
                                <span className={`status ${verification?.verifyStatus === 'VERIFIED' ? 'green'
                                    : verification?.verifyStatus === 'PENDING' ? 'orange' : 'gray'}`}>
                                    {verification?.verifyStatusLabel ?? '미인증'}
                                </span>
                            </div>
                            <p className="xs dim" style={{ marginTop: 6 }}>
                                자격증과 사무소 정보를 제출하면 관리자 확인 후 인증 마크가 발급됩니다.
                            </p>
                        </Link>
                    </div>

                    {/* ── 문의 관리 ─────────────────────────────────── */}
                    <div className="section-head" style={{ marginTop: 48 }}>
                        <div>
                            <h2>상담 관리</h2>
                            <p>상담 요청을 클릭하면 답변하기 화면으로 이동합니다.</p>
                        </div>
                        <select
                            className="search-box"
                            style={{ maxWidth: 180 }}
                            value={filter}
                            onChange={(event) => setFilter(event.target.value)}
                        >
                            {CONSULTATION_FILTERS.map((item) => (
                                <option value={item.value} key={item.value}>{item.label}</option>
                            ))}
                        </select>
                    </div>

                    {loading && <p className="xs dim">불러오는 중입니다…</p>}

                    {!loading && consultations.length === 0 && (
                        <p className="xs dim">해당 조건의 상담이 없습니다.</p>
                    )}

                    <div className="stack">
                        {consultations.map((consultation) => (
                            <Link
                                className="card"
                                to={`/broker/consultations/${consultation.id}`}
                                key={consultation.id}
                            >
                                <div className="row between">
                                    <span className={`status ${CONSULTATION_STATUS_COLORS[consultation.status]}`}>
                                        {consultation.statusLabel}
                                    </span>
                                    <span className="xs dim">{consultation.createdAt}</span>
                                </div>
                                <h3 style={{ marginTop: 10 }}>{consultation.memberName ?? '이용자'} 님의 문의</h3>
                                <p className="xs dim" style={{ marginTop: 6 }}>{consultation.content}</p>
                                {consultation.preferredDate && (
                                    <p className="xs dim" style={{ marginTop: 4 }}>
                                        상담 희망일 {consultation.preferredDate}
                                    </p>
                                )}
                            </Link>
                        ))}
                    </div>
                </div>
            </section>
        </main>
    );
}

export default BrokerMyPage;
