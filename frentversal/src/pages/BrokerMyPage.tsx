import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { getConsultations, getDashboard } from '../api/myAgencyApi';
import { getMyVerification } from '../api/brokerApi';
import { withdrawMember } from '../api/withdrawalApi';
import type { Consultation, MyAgencyDashboard, BrokerVerification } from '../types/MyAgency';
import type { User } from '../types/User';
import { CONSULTATION_FILTERS, CONSULTATION_STATUS_COLORS } from '../utils/consultationStatus';

// 중개인으로 로그인했을 때 보이는 마이페이지
//
// 구성 : 대시보드(매물 현황) → 바로가기 카드들 → "내 정보"/"상담 관리" 탭
// 대시보드·바로가기는 요약/이동용이라 탭 밖에 항상 보이게 두고, 탭 전환은
// 사용자 마이페이지(MyPage.tsx)와 같은 방식으로 서버 요청 없이 화면 안에서만 처리한다.
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

    const [activeTab, setActiveTab] = useState<'info' | 'consultations'>('info');

    const SOCIAL_LABEL: Record<Exclude<User['socialType'], 'NONE'>, string> = {
        KAKAO: '카카오', GOOGLE: 'Google', NAVER: '네이버',
    };

    // 회원 탈퇴 폼. 중개인은 패스워드리스가 가입 시 자동 등록되므로
    // 사용자 마이페이지와 달리 등록 여부 안내 없이 탈퇴 버튼만 둔다.
    const [withdrawOpen, setWithdrawOpen] = useState(false);
    const [withdrawPassword, setWithdrawPassword] = useState('');
    const [withdrawError, setWithdrawError] = useState('');
    const [withdrawing, setWithdrawing] = useState(false);

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

    const handleWithdraw = async () => {
        setWithdrawing(true);
        setWithdrawError('');
        try {
            await withdrawMember(withdrawPassword);
            // 탈퇴하면 등록한 매물·사무소·패스워드리스 등록까지 서버가 한 번에 정리한다(MemberService.withdrawal 참고).
            localStorage.removeItem('user');
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            window.location.href = '/member/login';
        } catch (error: any) {
            setWithdrawError(error?.response?.data?.message ?? '탈퇴 처리 중 오류가 발생했습니다.');
            setWithdrawing(false);
        }
    };

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

                    {/*  대시보드 : 매물이 거치는 4단계를 순서대로 배치
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

                    {/*  바로가기 카드  */}
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

                    {/*  탭  */}
                    <div className="tabs" style={{ marginTop: 48 }}>
                        <button
                            className={`tab-btn ${activeTab === 'info' ? 'on' : ''}`}
                            onClick={() => setActiveTab('info')}
                        >
                            내 정보
                        </button>
                        <button
                            className={`tab-btn ${activeTab === 'consultations' ? 'on' : ''}`}
                            onClick={() => setActiveTab('consultations')}
                        >
                            상담 관리
                        </button>
                    </div>

                    {/*  내 정보 탭  */}
                    {activeTab === 'info' && (
                        <div className="grid-2" style={{ marginTop: 20 }}>
                            {user.socialType !== 'NONE' && (
                                <section className="card">
                                    <h2>계정</h2>
                                    <div className="stack" style={{ marginTop: 14 }}>
                                        <div className="row between">
                                            <div>
                                                <strong>연동 소셜 계정</strong>
                                                <p className="xs dim">
                                                    {SOCIAL_LABEL[user.socialType]} 계정과 연동되어 있습니다.
                                                </p>
                                            </div>
                                            <span className="status green">연동됨</span>
                                        </div>
                                    </div>
                                </section>
                            )}

                            <section className="card">
                                <h2>프로필</h2>
                                <div className="side-nav" style={{ marginTop: 13 }}>
                                    {/* TODO: 닉네임·휴대폰 수정은 User 타입에 값이 아직 없어서 표시만 이름으로 대체. */}
                                    <a href="#" onClick={(event) => event.preventDefault()}>이름 · {user.name}</a>
                                </div>

                                {!withdrawOpen && (
                                    <button
                                        className="danger-btn"
                                        style={{ marginTop: 16 }}
                                        onClick={() => setWithdrawOpen(true)}
                                    >
                                        회원 탈퇴
                                    </button>
                                )}

                                {withdrawOpen && (
                                    <div className="stack" style={{ marginTop: 16 }}>
                                        <p className="xs dim">
                                            탈퇴하면 등록한 매물·중개사무소·패스워드리스 등록까지 함께 삭제됩니다.
                                            받은 리뷰·상담 기록은 "탈퇴한 회원"으로 표시된 채 남습니다.
                                        </p>
                                        <input
                                            type="password"
                                            placeholder="비밀번호 (비밀번호가 없는 계정은 비워두세요)"
                                            value={withdrawPassword}
                                            onChange={(event) => setWithdrawPassword(event.target.value)}
                                        />
                                        {withdrawError && (
                                            <p className="xs" style={{ color: '#d33' }}>{withdrawError}</p>
                                        )}
                                        <div className="row" style={{ gap: 8 }}>
                                            <button className="danger-btn" onClick={handleWithdraw} disabled={withdrawing}>
                                                {withdrawing ? '처리 중…' : '탈퇴 확인'}
                                            </button>
                                            <button
                                                className="outline-btn"
                                                onClick={() => { setWithdrawOpen(false); setWithdrawError(''); setWithdrawPassword(''); }}
                                            >
                                                취소
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </section>
                        </div>
                    )}

                    {/*  상담 관리 탭 (기존 문의 관리 내용 그대로)  */}
                    {activeTab === 'consultations' && (
                        <>
                            <div className="section-head" style={{ marginTop: 20 }}>
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
                        </>
                    )}
                </div>
            </section>
        </main>
    );
}

export default BrokerMyPage;