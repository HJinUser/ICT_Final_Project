import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { getConsultation, replyToConsultation, updateConsultationStatus } from '../api/myAgencyApi';
import type { Consultation, ConsultationStatus } from '../types/MyAgency';
import { CONSULTATION_STATUS_COLORS } from '../utils/consultationStatus';

// 상담 요청에 답변하는 화면 (중개인 전용)
//
// 화면 구성은 이메일을 읽는 것과 비슷하게 만들었다.
//   보낸 사람 / 받은 날짜 / 상담 희망일 / 문의 내용  → 아래에 [답변하기] 버튼
//   [답변하기] 를 누르면 입력 칸이 열리고, [답변 보내기] 로 전송한다.
//
// 답변을 보내면 문의 상태가 '답변 완료'로 바뀐다.

function ConsultationReplyPage() {
    const { id } = useParams();
    const consultationId = Number(id);
    const navigate = useNavigate();

    const [consultation, setConsultation] = useState<Consultation | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');

    // 답변 입력 칸은 [답변하기] 를 눌러야 열린다
    const [writing, setWriting] = useState(false);
    const [reply, setReply] = useState('');
    const [sending, setSending] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (Number.isNaN(consultationId)) {
            setLoadError('잘못된 주소입니다.');
            setLoading(false);
            return;
        }

        getConsultation(consultationId)
            .then((data) => {
                setConsultation(data);
                setReply(data.reply ?? '');
            })
            .catch((error) => {
                setLoadError(error.response?.data?.message ?? '문의를 불러오지 못했습니다.');
            })
            .finally(() => setLoading(false));
    }, [consultationId]);

    // 답변 보내기
    const handleSend = async () => {
        if (!reply.trim()) {
            setMessage('답변 내용을 입력해 주세요.');
            return;
        }

        setSending(true);

        try {
            const result = await replyToConsultation(consultationId, reply);

            setMessage(result);
            setWriting(false);

            // 상태(답변 완료)와 답변 시각을 반영하기 위해 다시 불러온다
            setConsultation(await getConsultation(consultationId));
        } catch (error: any) {
            setMessage(error.response?.data?.message ?? '답변 전송에 실패했습니다.');
        } finally {
            setSending(false);
        }
    };

    // 상담 상태 변경 (상담 완료 / 종료)
    const handleStatus = async (status: ConsultationStatus) => {
        try {
            setMessage(await updateConsultationStatus(consultationId, status));
            setConsultation(await getConsultation(consultationId));
        } catch (error: any) {
            setMessage(error.response?.data?.message ?? '상태 변경에 실패했습니다.');
        }
    };

    if (loading) {
        return <main><section className="section"><div className="wrap"><p className="dim">불러오는 중입니다…</p></div></section></main>;
    }

    if (loadError || !consultation) {
        return (
            <main>
                <section className="section"><div className="wrap">
                    <p style={{ color: 'var(--red)' }}>{loadError || '문의를 찾을 수 없습니다.'}</p>
                    <Link className="outline-btn" to="/broker/mypage" style={{ marginTop: 14, display: 'inline-block' }}>
                        마이페이지로 돌아가기
                    </Link>
                </div></section>
            </main>
        );
    }

    return (
        <main>
            <section className="section">
                <div className="wrap" style={{ maxWidth: 860 }}>
                    <button className="outline-btn" onClick={() => navigate(-1)}>← 목록으로</button>

                    {/* ── 받은 문의 (이메일처럼 보이는 영역) ───────────── */}
                    <section className="card" style={{ marginTop: 18 }}>
                        <div className="row between">
                            <div>
                                <span className={`status ${CONSULTATION_STATUS_COLORS[consultation.status]}`}>
                                    {consultation.statusLabel}
                                </span>
                                <h2 style={{ marginTop: 10 }}>{consultation.memberName ?? '이용자'} 님의 상담 요청</h2>
                            </div>
                            <span className="xs dim">{consultation.createdAt}</span>
                        </div>

                        <div className="divider" style={{ margin: '18px 0' }}></div>

                        {/* 연락처는 상담 요청 시 사용자가 정보 제공에 동의했기 때문에 볼 수 있다.
                            사이트는 연결까지만 해 주고, 실제 연락은 중개인이 직접 한다. */}
                        <div className="grid-3">
                            <div className="soft">
                                <span className="xs dim">연락처</span>
                                <strong style={{ display: 'block', marginTop: 5 }}>{consultation.memberPhone ?? '-'}</strong>
                            </div>
                            <div className="soft">
                                <span className="xs dim">이메일</span>
                                <strong style={{ display: 'block', marginTop: 5 }}>{consultation.memberEmail ?? '-'}</strong>
                            </div>
                            <div className="soft">
                                <span className="xs dim">상담 희망일</span>
                                <strong style={{ display: 'block', marginTop: 5 }}>{consultation.preferredDate ?? '미지정'}</strong>
                            </div>
                        </div>

                        {consultation.propertyId && (
                            <p className="xs dim" style={{ marginTop: 14 }}>
                                문의한 매물 :{' '}
                                <Link to={`/property/${consultation.propertyId}`}>매물 상세 보기</Link>
                            </p>
                        )}

                        <p style={{ marginTop: 18, whiteSpace: 'pre-wrap' }}>{consultation.content}</p>
                    </section>

                    {/* ── 이미 보낸 답변이 있으면 보여 준다 ────────────── */}
                    {consultation.reply && (
                        <section className="card" style={{ marginTop: 18 }}>
                            <div className="row between">
                                <h3>보낸 답변</h3>
                                <span className="xs dim">{consultation.repliedAt}</span>
                            </div>
                            <p style={{ marginTop: 10, whiteSpace: 'pre-wrap' }}>{consultation.reply}</p>
                        </section>
                    )}

                    {message && <p className="xs" style={{ marginTop: 14, color: 'var(--v)' }}>{message}</p>}

                    {/* ── 답변하기 ─────────────────────────────────── */}
                    {!writing ? (
                        <div className="row" style={{ gap: 10, marginTop: 18 }}>
                            <button className="solid-btn" onClick={() => setWriting(true)}>
                                {consultation.reply ? '답변 수정하기' : '답변하기'}
                            </button>

                            {/* 답변을 보내면 '상담 확정'이 된다. 그 뒤 상담이 끝나면 '상담 완료'로 바꾼다. */}
                            {consultation.status === 'ACCEPTED' && (
                                <button className="outline-btn" onClick={() => handleStatus('DONE')}>상담 완료</button>
                            )}

                            {consultation.status !== 'CLOSED' && consultation.status !== 'DONE' && (
                                <button className="outline-btn" onClick={() => handleStatus('CLOSED')}>종료</button>
                            )}
                        </div>
                    ) : (
                        <section className="card" style={{ marginTop: 18 }}>
                            <div className="field">
                                <label>답변 내용</label>
                                <textarea
                                    placeholder="답변을 입력하세요"
                                    value={reply}
                                    onChange={(event) => setReply(event.target.value)}
                                />
                            </div>

                            <div className="row" style={{ gap: 10, marginTop: 14 }}>
                                <button className="solid-btn" onClick={handleSend} disabled={sending}>
                                    {sending ? '보내는 중…' : '답변 보내기'}
                                </button>
                                <button className="outline-btn" onClick={() => setWriting(false)}>취소</button>
                            </div>
                        </section>
                    )}
                </div>
            </section>
        </main>
    );
}

export default ConsultationReplyPage;
