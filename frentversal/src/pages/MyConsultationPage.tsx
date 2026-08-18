import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { checkConsultationReply, getMyConsultations } from '../api/myConsultationApi';
import type { MyConsultation } from '../types/Consultation';
import type { User } from '../types/User';
import { CONSULTATION_STATUS_COLORS } from '../utils/consultationStatus';

// 사용자가 자기가 보낸 상담과 받은 답변을 확인하는 화면
//
// 헤더 알림의 "○○에서 답변이 도착했습니다" 를 누르면 이 화면으로 온다.
// 답변을 펼쳐 보면 확인 처리가 되고, 그때부터 알림 목록에서 사라진다.

interface Props {
    user: User | null;
}

function MyConsultationPage({ user }: Props) {
    const [consultations, setConsultations] = useState<MyConsultation[]>([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');

    // 지금 답변을 펼쳐 놓은 상담 id
    const [openId, setOpenId] = useState<number | null>(null);

    const load = useCallback(async () => {
        if (!user) {
            setLoading(false);
            return;
        }

        setLoading(true);

        try {
            const data = await getMyConsultations();
            setConsultations(data.content);
        } catch (error: any) {
            setMessage(error.response?.data?.message ?? '상담 내역을 불러오지 못했습니다.');
            setConsultations([]);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        load();
    }, [load]);

    // 답변 펼치기. 처음 펼칠 때 서버에 "확인했다"고 알린다.
    const toggleReply = async (consultation: MyConsultation) => {
        if (openId === consultation.id) {
            setOpenId(null);
            return;
        }

        setOpenId(consultation.id);

        // 이미 확인한 답변이면 다시 알릴 필요가 없다
        if (consultation.replyChecked) return;

        try {
            const updated = await checkConsultationReply(consultation.id);

            // 화면의 확인 표시만 갱신한다 (목록 전체를 다시 부르면 펼친 상태가 닫힌다)
            setConsultations((prev) =>
                prev.map((item) => (item.id === updated.id ? updated : item)),
            );
        } catch {
            // 확인 처리가 실패해도 답변은 이미 보이고 있으므로 화면을 막지 않는다
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

    // 아직 확인하지 않은 답변 개수 (상단 요약)
    const unreadCount = consultations.filter((item) => item.reply && !item.replyChecked).length;

    return (
        <main>
            <section className="page-hero">
                <div className="wrap">
                    <div>
                        <div className="eyebrow">내 상담</div>
                        <h1>상담 내역</h1>
                        <p>중개사무소에 보낸 상담 요청과 받은 답변을 확인하세요.</p>
                    </div>
                    <div className="hero-stat">
                        <span className="mono dim">새 답변</span>
                        <strong>{unreadCount}건</strong>
                        <span className="xs dim">보낸 상담 {consultations.length}건</span>
                    </div>
                </div>
            </section>

            <section className="section">
                <div className="wrap">
                    {message && <p className="xs" style={{ marginBottom: 16, color: 'var(--v)' }}>{message}</p>}

                    {loading && <p className="xs dim">불러오는 중입니다…</p>}

                    {!loading && consultations.length === 0 && (
                        <>
                            <p className="xs dim">보낸 상담이 없습니다.</p>
                            <Link className="solid-btn" to="/agency" style={{ marginTop: 14, display: 'inline-block' }}>
                                중개사무소 둘러보기
                            </Link>
                        </>
                    )}

                    <div className="stack">
                        {consultations.map((consultation) => (
                            <div className="card" key={consultation.id}>
                                <div className="row between">
                                    <span className={`status ${CONSULTATION_STATUS_COLORS[consultation.status]}`}>
                                        {consultation.statusLabel}
                                    </span>
                                    <span className="xs dim">보낸 날짜 {consultation.createdAt}</span>
                                </div>

                                <h3 style={{ marginTop: 10 }}>
                                    {consultation.agencyId ? (
                                        <Link to={`/agency/${consultation.agencyId}`}>{consultation.agencyName}</Link>
                                    ) : (
                                        consultation.agencyName ?? '중개사무소'
                                    )}
                                </h3>

                                <p className="xs dim" style={{ marginTop: 6 }}>
                                    담당 {consultation.brokerName ?? '-'}
                                    {consultation.agencyPhone ? ` · ${consultation.agencyPhone}` : ''}
                                    {consultation.preferredDate ? ` · 희망일 ${consultation.preferredDate}` : ''}
                                </p>

                                {consultation.propertyId && (
                                    <p className="xs dim" style={{ marginTop: 4 }}>
                                        문의한 매물 : <Link to={`/property/${consultation.propertyId}`}>매물 상세 보기</Link>
                                    </p>
                                )}

                                <div className="soft" style={{ marginTop: 12 }}>
                                    <span className="xs dim">내가 보낸 문의</span>
                                    <p style={{ marginTop: 5, whiteSpace: 'pre-wrap' }}>{consultation.content}</p>
                                </div>

                                {/* ── 답변 ───────────────────────────────── */}
                                {!consultation.reply ? (
                                    <p className="xs dim" style={{ marginTop: 14 }}>
                                        아직 답변이 도착하지 않았습니다.
                                    </p>
                                ) : (
                                    <div style={{ marginTop: 14 }}>
                                        <div className="row" style={{ gap: 10, alignItems: 'center' }}>
                                            <button className="solid-btn" onClick={() => toggleReply(consultation)}>
                                                {openId === consultation.id ? '답변 접기' : '답변 보기'}
                                            </button>
                                            {!consultation.replyChecked && (
                                                <span className="status orange">새 답변</span>
                                            )}
                                            <span className="xs dim">{consultation.repliedAt}</span>
                                        </div>

                                        {openId === consultation.id && (
                                            <div className="soft" style={{ marginTop: 12 }}>
                                                <span className="xs dim">
                                                    {consultation.agencyName} 답변 · {consultation.repliedAt}
                                                </span>
                                                <p style={{ marginTop: 5, whiteSpace: 'pre-wrap' }}>{consultation.reply}</p>
                                                <p className="xs dim" style={{ marginTop: 10 }}>
                                                    자세한 내용은 {consultation.agencyPhone ?? '사무소 연락처'} 로 직접 문의해 주세요.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </main>
    );
}

export default MyConsultationPage;
