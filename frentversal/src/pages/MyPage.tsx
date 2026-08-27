import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import customAxios from '../api/axiosInstance';
import { getMyConsultations } from '../api/myConsultationApi';
import { isPasswordlessRegistered, withdrawPasswordless } from '../api/passwordlessApi';
import { withdrawMember } from '../api/withdrawalApi';
import type { MyConsultation } from '../types/Consultation';
import type { PropertyResponse } from '../types/Property';
import type { User } from '../types/User';

// 사용자 마이페이지
//
// 프로토타입(mypage.html)의 사용자 화면을 옮긴 것이다.
// "내 정보"/"내 활동" 두 탭으로 나뉜다. 탭 전환은 서버 요청 없이 화면 안에서만 처리한다.
// "내 활동" 탭에서 알림내역을 누르면 상담 답변 화면(/my-consultations)으로 간다.
// 관심매물은 FavoritesPage(/favorites)가 이미 구현되어 있어 그쪽으로 연결한다.
//
// 비교 기록·평가내역은 아직 서버 기능이 없다.
// 숫자를 지어내면 실제로 되는 것과 구분이 안 되므로, 준비 중이라고 표시해 둔다.

interface Props {
    user: User | null;
}

// 매물 상세를 열면 PropertyPage 가 이 이름으로 localStorage 에 기록한다
const RECENT_VIEWED_KEY = 'recentlyViewedProperties';

function MyPage({ user }: Props) {
    const [activeTab, setActiveTab] = useState<'info' | 'activity'>('info');

    const [consultations, setConsultations] = useState<MyConsultation[]>([]);
    const [recentViewedCount, setRecentViewedCount] = useState(0);
    const [favoritesCount, setFavoritesCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const SOCIAL_LABEL: Record<Exclude<User['socialType'], 'NONE'>, string> = {
        KAKAO: '카카오', GOOGLE: 'Google', NAVER: '네이버',
    };

    // 패스워드리스 등록 여부. 일반 사용자에게만 보여 준다(중개인은 자동 등록이라 이 항목 자체가 없다).
    const [passwordlessRegistered, setPasswordlessRegistered] = useState(false);

    // 패스워드리스 해지 폼
    const [pwlessWithdrawOpen, setPwlessWithdrawOpen] = useState(false);
    const [pwlessWithdrawPassword, setPwlessWithdrawPassword] = useState('');
    const [pwlessWithdrawError, setPwlessWithdrawError] = useState('');
    const [pwlessWithdrawing, setPwlessWithdrawing] = useState(false);

    // 회원 탈퇴 폼
    const [withdrawOpen, setWithdrawOpen] = useState(false);
    const [withdrawPassword, setWithdrawPassword] = useState('');
    const [withdrawError, setWithdrawError] = useState('');
    const [withdrawing, setWithdrawing] = useState(false);

    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }

        getMyConsultations()
            .then((data) => setConsultations(data.content))
            .catch(() => setConsultations([]))
            .finally(() => setLoading(false));

        customAxios.get<PropertyResponse[]>('/property/favorites')
            .then((response) => setFavoritesCount(response.data.length))
            .catch(() => setFavoritesCount(0));

        // 최근 본 매물은 서버가 아니라 브라우저에 저장된다
        try {
            const raw = localStorage.getItem(RECENT_VIEWED_KEY);
            setRecentViewedCount(raw ? JSON.parse(raw).length : 0);
        } catch {
            setRecentViewedCount(0);
        }

        if (user.role === 'USER') {
            isPasswordlessRegistered(user.email)
                .then(setPasswordlessRegistered)
                .catch(() => setPasswordlessRegistered(false));
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

    const handleWithdraw = async () => {
        // 되돌릴 수 없는 작업이라 실행 직전에 한 번 더 확인받는다.
        if (!window.confirm('정말로 탈퇴하시겠습니까?')) {
            return;
        }

        setWithdrawing(true);
        setWithdrawError('');
        try {
            await withdrawMember(withdrawPassword);
            // 탈퇴 성공: 로컬에 남은 로그인 정보를 지우고 로그인 화면으로 보낸다.
            // App.tsx의 user state까지 지우려면 새 prop을 하나 더 뚫어야 하는데,
            // 계정 자체가 없어진 뒤라 새로고침으로 완전히 초기화하는 편이 더 확실하다.
            localStorage.removeItem('user');
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            window.location.href = '/member/login';
        } catch (error: any) {
            setWithdrawError(error?.response?.data?.message ?? '탈퇴 처리 중 오류가 발생했습니다.');
            setWithdrawing(false);
        }
    };

    const handlePasswordlessWithdraw = async () => {
        // 되돌릴 수 없는 작업이라 실행 직전에 한 번 더 확인받는다.
        if (!window.confirm('정말로 해지하겠습니까?')) {
            return;
        }

        setPwlessWithdrawing(true);
        setPwlessWithdrawError('');
        try {
            await withdrawPasswordless(user.email, pwlessWithdrawPassword);
            setPasswordlessRegistered(false);
            setPwlessWithdrawOpen(false);
            setPwlessWithdrawPassword('');
        } catch (error: any) {
            setPwlessWithdrawError(error?.response?.data?.message ?? '해지 처리 중 오류가 발생했습니다.');
        } finally {
            setPwlessWithdrawing(false);
        }
    };

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
                            <strong>{favoritesCount}</strong>
                            <span className="delta">담아 둔 매물</span>
                        </div>
                    </div>

                    {/* ── 탭 ───────────────────────────────────────── */}
                    <div className="tabs" style={{ marginTop: 26 }}>
                        <button
                            className={`tab-btn ${activeTab === 'info' ? 'on' : ''}`}
                            onClick={() => setActiveTab('info')}
                        >
                            내 정보
                        </button>
                        <button
                            className={`tab-btn ${activeTab === 'activity' ? 'on' : ''}`}
                            onClick={() => setActiveTab('activity')}
                        >
                            내 활동
                        </button>
                    </div>

                    {/* ── 내 정보 탭 ───────────────────────────────── */}
                    {activeTab === 'info' && (
                        <div className="grid-2" style={{ marginTop: 20 }}>
                            <section className="card">
                                <h2>계정</h2>
                                <div className="stack" style={{ marginTop: 14 }}>
                                    {user.socialType !== 'NONE' && (
                                        <div className="row between">
                                            <div>
                                                <strong>연동 소셜 계정</strong>
                                                <p className="xs dim">
                                                    {SOCIAL_LABEL[user.socialType]} 계정과 연동되어 있습니다.
                                                </p>
                                            </div>
                                            <span className="status green">연동됨</span>
                                        </div>
                                    )}

                                    {user.socialType === 'NONE' && (
                                        <div className="stack">
                                            <div className="row between">
                                                <div>
                                                    <strong>패스워드리스</strong>
                                                    <p className="xs dim">
                                                        {passwordlessRegistered
                                                            ? '패스워드리스로 등록된 계정입니다.'
                                                            : '패스워드리스 미등록 사용자입니다.'}
                                                    </p>
                                                </div>
                                                {!passwordlessRegistered && (
                                                    <Link className="outline-btn" to="/member/passwordless">등록하기</Link>
                                                )}
                                                {passwordlessRegistered && !pwlessWithdrawOpen && (
                                                    <button className="outline-btn" onClick={() => setPwlessWithdrawOpen(true)}>
                                                        해지하기
                                                    </button>
                                                )}
                                            </div>

                                            {passwordlessRegistered && pwlessWithdrawOpen && (
                                                <div className="stack" style={{ marginTop: 8 }}>
                                                    <input
                                                        type="password"
                                                        placeholder="비밀번호"
                                                        value={pwlessWithdrawPassword}
                                                        onChange={(event) => setPwlessWithdrawPassword(event.target.value)}
                                                    />
                                                    {pwlessWithdrawError && (
                                                        <p className="xs" style={{ color: '#d33' }}>{pwlessWithdrawError}</p>
                                                    )}
                                                    <div className="row" style={{ gap: 8 }}>
                                                        <button className="outline-btn" onClick={handlePasswordlessWithdraw} disabled={pwlessWithdrawing}>
                                                            {pwlessWithdrawing ? '처리 중…' : '해지 확인'}
                                                        </button>
                                                        <button
                                                            className="outline-btn"
                                                            onClick={() => { setPwlessWithdrawOpen(false); setPwlessWithdrawError(''); setPwlessWithdrawPassword(''); }}
                                                        >
                                                            취소
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </section>

                            <section className="card">
                                <h2>프로필</h2>
                                <div className="side-nav" style={{ marginTop: 13 }}>
                                    {/* TODO: 닉네임·휴대폰 수정은 User 타입에 값이 아직 없어서 표시만 이름으로 대체.
                                        서버가 값을 내려주고 수정 API가 생기면 mypage.html처럼 각 줄에 "수정" 링크를 붙인다. */}
                                    <a href="#" onClick={(event) => event.preventDefault()}>이름 · {user.name}</a>
                                </div>

                                {user.role !== 'ADMIN' && !withdrawOpen && (
                                    <button
                                        className="danger-btn"
                                        style={{ marginTop: 16 }}
                                        onClick={() => setWithdrawOpen(true)}
                                    >
                                        회원 탈퇴
                                    </button>
                                )}

                                {user.role !== 'ADMIN' && withdrawOpen && (
                                    <div className="stack" style={{ marginTop: 16 }}>
                                        <p className="xs dim">
                                            탈퇴하면 계정 정보는 삭제되고, 남긴 리뷰·상담·신고는 "탈퇴한 회원"으로 표시됩니다.
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

                    {/* ── 내 활동 탭 (기존 내용 그대로) ─────────────── */}
                    {activeTab === 'activity' && (
                        <div className="grid-2" style={{ marginTop: 20 }}>
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

                                    <Link to="/favorites">
                                        관심매물 <span>{favoritesCount}</span>
                                    </Link>

                                    {/* 비교 기록은 아직 서버 기능이 없다 */}
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
                    )}
                </div>
            </section>
        </main>
    );
}

export default MyPage;