import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { approveBroker, getAdminBrokers, rejectBroker } from '../api/adminApi';
import AdminTabs from '../components/AdminTabs';
import type { AdminBroker } from '../types/Admin';
import type { User } from '../types/User';
import '../assets/common.css';
import '../assets/responsive.css';

// 관리자 중개인 인증 심사 화면
//
// 중개인이 "내 중개사무소 인증 받기"에서 제출한 등록번호·상호·소재지·대표자·자격증 사진을
// 관리자가 실제 정보와 대조한 뒤 승인하거나 반려한다.
// 승인하면 중개사무소에 인증 마크가 붙어 사용자 화면에 "인증 완료"로 표시된다.

interface Props {
    user: User | null;
}

// 상태 필터 (서버의 status 파라미터 값과 같아야 한다)
const STATUS_FILTERS = [
    { value: 'PENDING', label: '심사 중' },
    { value: 'VERIFIED', label: '인증 완료' },
    { value: 'UNVERIFIED', label: '미인증' },
    { value: 'ALL', label: '전체' },
];

// 상태별 배지 색상 (common.css 의 .status.*)
const STATUS_COLORS: Record<string, string> = {
    UNVERIFIED: 'gray',
    PENDING: 'orange',
    VERIFIED: 'green',
};

function AdminBrokerPage({ user }: Props) {
    const navigate = useNavigate();

    const [brokers, setBrokers] = useState<AdminBroker[]>([]);
    const [pendingCount, setPendingCount] = useState(0);

    const [filter, setFilter] = useState('PENDING');
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);

    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');

    // 반려 사유를 쓰고 있는 신청 id 와 입력값
    const [rejectTarget, setRejectTarget] = useState<number | null>(null);
    const [rejectReason, setRejectReason] = useState('');

    // 관리자가 아니면 홈으로 보낸다 (서버에서도 /admin/** 을 막는다)
    useEffect(() => {
        if (user && user.role !== 'ADMIN') {
            navigate('/');
        }
    }, [user, navigate]);

    const load = useCallback(async () => {
        // 관리자가 아니면 요청을 보내지 않는다 (401 이 오면 로그인 화면으로 튕긴다)
        if (user?.role !== 'ADMIN') {
            setLoading(false);
            return;
        }

        setLoading(true);

        try {
            const data = await getAdminBrokers(filter, page);

            setBrokers(data.content);
            setTotalPages(data.totalPages);
            setPendingCount(data.pendingCount);
        } catch (error: any) {
            setMessage(error.response?.data?.message ?? '인증 신청 목록을 불러오지 못했습니다.');
            setBrokers([]);
        } finally {
            setLoading(false);
        }
    }, [filter, page, user]);

    useEffect(() => {
        load();
    }, [load]);

    // 승인 : 심사 중 -> 인증 완료 (사무소에 인증 마크가 붙는다)
    const handleApprove = async (broker: AdminBroker) => {
        try {
            const result = await approveBroker(broker.id);

            setMessage(`${broker.businessName ?? broker.memberName} — ${result.message}`);
            await load();
        } catch (error: any) {
            setMessage(error.response?.data?.message ?? '승인에 실패했습니다.');
        }
    };

    // 반려 : 사유를 남기면 중개인 화면에 그대로 보이고, 고쳐서 다시 신청할 수 있다
    const handleReject = async (broker: AdminBroker) => {
        if (!rejectReason.trim()) {
            setMessage('반려 사유를 입력해 주세요.');
            return;
        }

        try {
            const result = await rejectBroker(broker.id, rejectReason);

            setMessage(`${broker.businessName ?? broker.memberName} — ${result.message}`);
            setRejectTarget(null);
            setRejectReason('');
            await load();
        } catch (error: any) {
            setMessage(error.response?.data?.message ?? '반려에 실패했습니다.');
        }
    };

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
                        <div className="eyebrow">관리자</div>
                        <h1>중개인 인증</h1>
                        <p>제출된 자격증과 사무소 정보를 확인하고 인증 마크를 발급합니다.</p>
                    </div>
                    <div className="hero-stat">
                        <span className="mono dim">심사 대기</span>
                        <strong>{pendingCount}건</strong>
                        <span className="xs dim">먼저 신청한 순서로 표시됩니다.</span>
                    </div>
                </div>
            </section>

            <section className="section">
                <div className="wrap">
                    <AdminTabs />

                    <div className="section-head">
                        <div>
                            <h2>인증 신청 목록</h2>
                            <p>한 페이지에 10건씩 표시됩니다.</p>
                        </div>
                        <select
                            className="search-box"
                            style={{ maxWidth: 180 }}
                            value={filter}
                            onChange={(event) => { setFilter(event.target.value); setPage(0); }}
                        >
                            {STATUS_FILTERS.map((item) => (
                                <option value={item.value} key={item.value}>{item.label}</option>
                            ))}
                        </select>
                    </div>

                    {message && <p className="xs" style={{ marginBottom: 16, color: 'var(--v)' }}>{message}</p>}

                    {loading && <p className="xs dim">불러오는 중입니다…</p>}

                    {!loading && brokers.length === 0 && (
                        <p className="xs dim">해당 조건의 신청이 없습니다.</p>
                    )}

                    <div className="stack">
                        {brokers.map((broker) => (
                            <div className="card" key={broker.id}>
                                <div className="row between">
                                    <span className={`status ${STATUS_COLORS[broker.verifyStatus] ?? 'gray'}`}>
                                        {broker.verifyStatusLabel}
                                    </span>
                                    <span className="xs dim">
                                        {broker.submittedAt ? `신청 ${broker.submittedAt}` : '신청 이력 없음'}
                                    </span>
                                </div>

                                <h3 style={{ marginTop: 10 }}>{broker.businessName ?? '상호 미입력'}</h3>
                                <p className="xs dim" style={{ marginTop: 6 }}>
                                    {broker.memberName} · {broker.memberEmail} · {broker.memberPhone ?? '연락처 없음'}
                                </p>

                                <div className="divider" style={{ margin: '12px 0' }}></div>

                                {/* 관리자가 실제 정보와 대조할 제출 내용 */}
                                <div className="grid-3">
                                    <div className="soft">
                                        <span className="xs dim">등록번호</span>
                                        <strong style={{ display: 'block', marginTop: 5 }}>{broker.licenseNumber ?? '-'}</strong>
                                    </div>
                                    <div className="soft">
                                        <span className="xs dim">대표자</span>
                                        <strong style={{ display: 'block', marginTop: 5 }}>{broker.ownerName ?? '-'}</strong>
                                    </div>
                                    <div className="soft">
                                        <span className="xs dim">개설 등록일</span>
                                        <strong style={{ display: 'block', marginTop: 5 }}>{broker.registeredDate ?? '-'}</strong>
                                    </div>
                                    <div className="soft" style={{ gridColumn: '1 / -1' }}>
                                        <span className="xs dim">소재지</span>
                                        <strong style={{ display: 'block', marginTop: 5 }}>{broker.officeAddress ?? '-'}</strong>
                                    </div>
                                </div>

                                {/* 자격증 사진 — 관리자가 눈으로 대조한다 */}
                                {broker.licenseImageUrl ? (
                                    <p className="xs" style={{ marginTop: 12 }}>
                                        <a href={broker.licenseImageUrl} target="_blank" rel="noreferrer">
                                            자격증 사진 새 창으로 보기
                                        </a>
                                    </p>
                                ) : (
                                    <p className="xs dim" style={{ marginTop: 12 }}>자격증 사진이 제출되지 않았습니다.</p>
                                )}

                                {/* 연결된 사무소 */}
                                <div className="row between" style={{ marginTop: 12 }}>
                                    <span className="xs dim">
                                        {broker.agencyId ? (
                                            <Link to={`/agency/${broker.agencyId}`}>{broker.agencyName}</Link>
                                        ) : '연결된 사무소 없음'}
                                        {broker.agencyAddress ? ` · ${broker.agencyAddress}` : ''}
                                    </span>
                                    <span className={`status ${broker.agencyVerified ? 'green' : 'gray'}`}>
                                        {broker.agencyVerified ? '인증 마크 발급됨' : '인증 마크 없음'}
                                    </span>
                                </div>

                                {/* 이전에 반려한 적이 있으면 사유를 보여 준다 */}
                                {broker.rejectReason && (
                                    <div className="soft" style={{ marginTop: 12 }}>
                                        <span className="xs dim">반려 사유 · {broker.reviewedAt}</span>
                                        <p className="xs" style={{ marginTop: 5 }}>{broker.rejectReason}</p>
                                    </div>
                                )}

                                {/* 승인·반려는 심사 중일 때만 (서버도 같은 조건으로 막는다) */}
                                {broker.verifyStatus === 'PENDING' && (
                                    rejectTarget === broker.id ? (
                                        <div style={{ marginTop: 16 }}>
                                            <div className="field">
                                                <label>반려 사유</label>
                                                <textarea
                                                    placeholder="중개인에게 보일 반려 사유를 입력하세요"
                                                    value={rejectReason}
                                                    onChange={(event) => setRejectReason(event.target.value)}
                                                />
                                            </div>
                                            <div className="row" style={{ gap: 10, marginTop: 10 }}>
                                                <button className="solid-btn" onClick={() => handleReject(broker)}>
                                                    반려 확정
                                                </button>
                                                <button className="outline-btn" onClick={() => setRejectTarget(null)}>
                                                    취소
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="row" style={{ gap: 10, marginTop: 16 }}>
                                            <button className="solid-btn" onClick={() => handleApprove(broker)}>
                                                승인
                                            </button>
                                            <button
                                                className="outline-btn"
                                                onClick={() => { setRejectTarget(broker.id); setRejectReason(''); }}
                                            >
                                                반려
                                            </button>
                                        </div>
                                    )
                                )}
                            </div>
                        ))}
                    </div>

                    {/* 페이징 */}
                    {totalPages > 1 && (
                        <div className="row" style={{ gap: 6, marginTop: 18, justifyContent: 'center' }}>
                            {Array.from({ length: totalPages }, (_, index) => (
                                <button
                                    className={`tab-btn${page === index ? ' on' : ''}`}
                                    onClick={() => setPage(index)}
                                    key={index}
                                >
                                    {index + 1}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </section>
        </main>
    );
}

export default AdminBrokerPage;
