import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import customAxios from '../api/axiosInstance';
import { createPropertyEditRequest, getPropertyEditRequests } from '../api/adminApi';

import type { PropertyResponse } from '../types/Property';
import { PROPERTY_STATUS_LABELS } from '../types/PropertyDetail';
import type { PropertyEditRequest } from '../types/PropertyEditRequest';
import { EDIT_REQUEST_STATUS_COLORS } from '../types/PropertyEditRequest';
import type { User } from '../types/User';

import '../styles/PropertyEditRequestPage.css';

/*
  관리자 "매물 수정 요청" 화면 (매물 상세 -> 수정 요청)

  반려(등록 취소)는 되돌릴 수 없어서, 사진이 부족하다거나 설명이 부실한 정도의 문제까지
  반려로 처리하면 중개인이 매물을 통째로 다시 올려야 한다. 그래서 매물은 그대로 두고
  무엇을 고쳐야 하는지만 중개인에게 알리는 화면을 따로 둔다.

  보낸 요청은 중개인의 헤더 알림과 안내 메일로 전달되고, 중개인이 그 매물을 수정하면
  서버가 요청을 처리 완료로 바꾼다(중개인이 따로 확인 버튼을 누르지 않는다).

  이 화면은 /admin 콘솔 바깥에 있어서 콘솔의 권한 확인을 물려받지 못한다.
  그래서 여기서 직접 관리자인지 확인한다(서버도 /admin/** 로 한 번 더 막는다).
*/

interface Props {
    user: User | null;
}

const MAX_REASON_LENGTH = 1000;

function PropertyEditRequestPage({ user }: Props) {
    const { id } = useParams();
    const navigate = useNavigate();

    const [property, setProperty] = useState<PropertyResponse | null>(null);
    const [history, setHistory] = useState<PropertyEditRequest[]>([]);

    const [reason, setReason] = useState('');

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    const isAdmin = user?.role === 'ADMIN';

    // 관리자가 아닌 사람이 주소를 직접 입력해 들어오면 홈으로 보낸다.
    // (서버가 어차피 막지만, 빈 화면만 보이면 왜 안 되는지 알 수 없다)
    useEffect(() => {
        if (user && !isAdmin) {
            navigate('/');
        }
    }, [user, isAdmin, navigate]);

    // 지난 요청 이력. 요청을 보낸 뒤에도 이것만 다시 읽어야 해서 따로 뺐다.
    const loadHistory = useCallback(async () => {
        if (!id) return;

        try {
            setHistory(await getPropertyEditRequests(Number(id)));
        } catch (historyError) {
            console.error("수정 요청 이력 조회 실패:", historyError);
            // 이력을 못 읽어도 새 요청은 보낼 수 있어야 하므로 화면 전체를 막지 않는다
            setHistory([]);
            setError("지난 수정 요청 이력을 불러오지 못했습니다.");
        }
    }, [id]);

    // 매물 요약과 지난 요청 이력을 함께 불러온다
    useEffect(() => {
        if (!id || !isAdmin) {
            setLoading(false);
            return;
        }

        const load = async () => {
            setLoading(true);

            try {
                const response = await customAxios.get<PropertyResponse>(`/property/${id}`);

                setProperty(response.data);
                await loadHistory();
            } catch (loadError) {
                console.error("매물 정보 조회 실패:", loadError);
                setProperty(null);
                setError("매물 정보를 불러오지 못했습니다.");
            } finally {
                setLoading(false);
            }
        };

        void load();
    }, [id, isAdmin, loadHistory]);

    // 수정 요청 보내기
    const handleSubmit = async () => {
        if (!property || saving) return;

        const trimmed = reason.trim();

        if (!trimmed) {
            setMessage("");
            setError("수정 요청 사유를 입력해 주세요.");
            return;
        }

        setSaving(true);
        setError("");
        setMessage("");

        try {
            const result = await createPropertyEditRequest(property.id, trimmed);

            setReason("");
            setMessage(result.message);
            await loadHistory();
        } catch (submitError) {
            console.error("수정 요청 등록 실패:", submitError);

            // 400(사유 없음)·404(매물 없음)·409(임시저장·등록취소 매물)를 사용자가 알 수 있어야 한다
            const serverMessage = (submitError as {
                response?: { data?: { message?: string } };
            })?.response?.data?.message;

            setError(serverMessage ?? "수정 요청을 보내지 못했습니다. 잠시 후 다시 시도해 주세요.");
        } finally {
            setSaving(false);
        }
    };

    if (!user) {
        return (
            <main>
                <section className="section"><div className="wrap">
                    <p className="dim">로그인이 필요한 화면입니다.</p>

                    <Link
                        className="solid-btn"
                        to="/member/login"
                        style={{ marginTop: 14, display: 'inline-block' }}
                    >
                        로그인하러 가기
                    </Link>
                </div></section>
            </main>
        );
    }

    if (!isAdmin) {
        return (
            <main>
                <section className="section"><div className="wrap">
                    <p className="dim">관리자만 사용할 수 있는 화면입니다.</p>
                </div></section>
            </main>
        );
    }

    return (
        <main>
            <section className="page-hero">
                <div className="wrap">
                    <div>
                        <div className="eyebrow">Edit Request</div>

                        <h1>매물 수정 요청</h1>

                        <p>
                            매물을 내리지 않고 중개인에게 고칠 점만 알립니다.
                            <br />
                            보낸 내용은 중개인의 알림과 안내 메일로 전달되고, 중개인이 그 매물을
                            수정하면 자동으로 처리 완료가 됩니다.
                        </p>
                    </div>
                </div>
            </section>

            <section className="section">
                <div className="wrap">
                    {loading && <p className="xs dim">불러오는 중입니다…</p>}

                    {!loading && !property && (
                        <div className="card">
                            <p className="dim">매물 정보를 찾을 수 없습니다.</p>

                            <Link
                                className="outline-btn"
                                to="/admin/properties"
                                style={{ marginTop: 14, display: 'inline-block' }}
                            >
                                매물 관리로 돌아가기
                            </Link>
                        </div>
                    )}

                    {!loading && property && (
                        <div className="stack">
                            {/* 어떤 매물에 보내는 요청인지 */}
                            <div className="card">
                                <div className="row between">
                                    <span className="status gray">
                                        {PROPERTY_STATUS_LABELS[property.status]}
                                    </span>

                                    <span className={`status ${property.visible ? 'green' : 'orange'}`}>
                                        {property.visible ? '공개' : '비공개'}
                                    </span>
                                </div>

                                <h3 style={{ marginTop: 10 }}>
                                    <Link to={`/property/${property.id}`}>{property.name}</Link>
                                </h3>

                                <p className="xs dim" style={{ marginTop: 6 }}>
                                    {property.address}
                                </p>
                            </div>

                            {/* 요청 작성 */}
                            <div className="card">
                                <div className="section-head">
                                    <div>
                                        <h2 style={{ fontSize: 17 }}>요청 내용</h2>
                                        <p className="xs dim">
                                            어느 항목을 어떻게 고쳐야 하는지 구체적으로 적어 주세요.
                                            적은 내용이 중개인에게 그대로 전달됩니다.
                                        </p>
                                    </div>
                                </div>

                                <label className="field">
                                    <span className="xs dim">수정 요청 사유</span>

                                    <textarea
                                        value={reason}
                                        maxLength={MAX_REASON_LENGTH}
                                        placeholder="예) 대표 사진이 실제 매물과 달라 보입니다. 내부 사진으로 교체해 주세요."
                                        onChange={(event) => setReason(event.target.value)}
                                    />
                                </label>

                                <p className="xs dim editreq-count">
                                    {reason.length} / {MAX_REASON_LENGTH}
                                </p>

                                {error && <p className="xs editreq-error">{error}</p>}

                                {message && <p className="xs editreq-message">{message}</p>}

                                <div className="row gap8" style={{ marginTop: 16 }}>
                                    <button
                                        className="solid-btn"
                                        type="button"
                                        disabled={saving || !reason.trim()}
                                        onClick={handleSubmit}
                                    >
                                        {saving ? '보내는 중…' : '수정 요청 보내기'}
                                    </button>

                                    <Link className="outline-btn" to={`/property/${property.id}`}>
                                        매물 상세로 돌아가기
                                    </Link>
                                </div>
                            </div>

                            {/* 지난 요청 이력 */}
                            <div className="card">
                                <div className="section-head">
                                    <div>
                                        <h2 style={{ fontSize: 17 }}>지난 수정 요청</h2>
                                        <p className="xs dim">최근에 보낸 요청이 위에 옵니다.</p>
                                    </div>

                                    <span className="status gray">{history.length}건</span>
                                </div>

                                {history.length === 0 && (
                                    <p className="xs dim">아직 이 매물에 보낸 수정 요청이 없습니다.</p>
                                )}

                                <div className="stack">
                                    {history.map((item) => (
                                        <div className="editreq-item" key={item.id}>
                                            <div className="row between">
                                                <span
                                                    className={`status ${EDIT_REQUEST_STATUS_COLORS[item.status]}`}
                                                >
                                                    {item.statusLabel}
                                                </span>

                                                <span className="xs dim">{item.createdAt}</span>
                                            </div>

                                            <p className="editreq-reason">{item.reason}</p>

                                            <p className="xs dim">
                                                {item.requesterName} 보냄
                                                {item.resolvedAt ? ` · ${item.resolvedAt} 처리 완료` : ''}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </section>
        </main>
    );
}

export default PropertyEditRequestPage;
