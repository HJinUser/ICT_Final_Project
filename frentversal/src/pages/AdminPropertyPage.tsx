import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

// 이 컴포넌트/함수에서 사용할 React 기능과 프로젝트 모듈 불러옴
import {
    approveProperty,
    evaluatePropertyPrice,
    getAdminProperties,
    rejectProperty,
    hideProperty,
    unhideProperty,
    // 관리자 API에서 사용하는 가격평가 상태 TypeScript 타입도 함께 import함
    type PriceEvaluationStatus,
} from '../api/adminApi';

import type { AdminProperty } from '../types/Admin';
import type { User } from '../types/User';

// 관리자 매물 관리 화면
//
// 중개인이 매물을 등록하면 "승인 대기" 상태로 저장되고, 관리자가 승인해야 사용자 화면에 노출된다.
// 그래서 이 화면은 승인 대기 목록을 기본으로 보여 주고, 각 매물을 승인하거나 반려한다.
//
// 반려는 등록 취소(되돌릴 수 없음)로 처리되므로 누르기 전에 한 번 더 확인한다.

interface Props {
    user: User | null;
}

// 상태 필터 (서버의 status 파라미터 값과 같아야 한다)
const STATUS_FILTERS = [
    { value: 'PENDING', label: '승인 대기' },
    { value: 'ACTIVE', label: '게시중' },
    { value: 'CANCELLED', label: '등록 취소' },
    { value: 'ALL', label: '전체' },
];

// 상태별 배지 색상 (common.css 의 .status.*)
const STATUS_COLORS: Record<string, string> = {
    PENDING: 'orange',
    ACTIVE: 'green',
    IN_PROGRESS: 'purple',
    COMPLETED: 'gray',
    CANCELLED: 'red',
};

const PRICE_EVALUATION_LABELS: Record<PriceEvaluationStatus, string> = {
    UNDERVALUED: '저평가',
    FAIR: '적정',
    OVERVALUED: '고평가',
};

// 거래유형에 따라 AI 가격 카드의 제목 문구를 선택하는 함수임
const getAiPriceLabel = (property: AdminProperty): string => {
    if (property.dealType === 'SALE') {
        // 계산 또는 렌더링할 최종 결과를 반환함
        return property.aiPrice == null
            ? 'AI 예상 시세 없음'
            : `AI 예상 매매가 ${property.aiPrice.toLocaleString()}만원`;
    }

    if (property.dealType === 'JEONSE') {
        // 계산 또는 렌더링할 최종 결과를 반환함
        return property.aiDeposit == null
            ? 'AI 예상 시세 없음'
            : `AI 예상 전세보증금 ${property.aiDeposit.toLocaleString()}만원`;
    }

    if (
        property.aiMonthlyDeposit == null ||
        property.aiMonthlyRent == null
    ) {
        // 계산 또는 렌더링할 최종 결과를 반환함
        return 'AI 예상 시세 없음';
    }

    // 계산 또는 렌더링할 최종 결과를 반환함
    return `AI 예상 보증금 ${property.aiMonthlyDeposit.toLocaleString()}만원 / 월세 ${property.aiMonthlyRent.toLocaleString()}만원`;
};

function AdminPropertyPage({ user }: Props) {
    const [properties, setProperties] = useState<AdminProperty[]>([]);
    const [pendingCount, setPendingCount] = useState(0);

    const [filter, setFilter] = useState('PENDING');
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);

    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');

    // 목록 조회. 승인·반려 후에도 다시 불러와야 해서 따로 뺐다.
    const load = useCallback(async () => {
        // 관리자가 아니면 서버가 어차피 막으므로 요청을 보내지 않는다.
        // 보내면 401 이 오고, 그때 axios 가 로그인 화면으로 보내 버려서 안내 문구를 볼 수 없다.
        if (user?.role !== 'ADMIN') {
            setLoading(false);
            return;
        }

        setLoading(true);

        try {
            const data = await getAdminProperties(filter, page);

            setProperties(data.content);
            setTotalPages(data.totalPages);
            setPendingCount(data.pendingCount);
        } catch (error: any) {
            setMessage(error.response?.data?.message ?? '매물 목록을 불러오지 못했습니다.');
            setProperties([]);
        } finally {
            setLoading(false);
        }
    }, [filter, page, user]);

    useEffect(() => {
        load();
    }, [load]);

    // 관리자가 선택한 가격평가 상태를 서버에 저장하고 화면 목록/메시지를 갱신하는 함수임
    const handlePriceEvaluation = async (
        property: AdminProperty,
        status: PriceEvaluationStatus,
    ) => {
        // API 호출이나 비동기 처리 실패에 대비해 예외 처리 범위로 묶어둠
        try {
            const result = await evaluatePropertyPrice(property.id, status);

            setProperties((prev) =>
                prev.map((item) =>
                    item.id === property.id ? result.property : item,
                ),
            );

            setMessage(`${property.name} — ${result.message}`);
        } catch (error: any) {
            setMessage(
                error.response?.data?.message ??
                '가격 평가 저장에 실패했습니다.',
            );
        }
    };

    // 승인 : 승인 대기 -> 게시중
    const handleApprove = async (property: AdminProperty) => {
        try {
            const result = await approveProperty(property.id);

            setMessage(`${property.name} — ${result.message}`);
            await load(); // 목록에서 사라지고 승인 대기 건수도 줄어든다
        } catch (error: any) {
            setMessage(error.response?.data?.message ?? '승인에 실패했습니다.');
        }
    };

    // 반려 : 승인 대기 -> 등록 취소 (되돌릴 수 없음)
    const handleReject = async (property: AdminProperty) => {
        const confirmed = window.confirm(
            `"${property.name}" 매물을 반려하시겠습니까?\n반려하면 등록 취소 상태가 되며 되돌릴 수 없습니다.`,
        );

        if (!confirmed) return;

        try {
            const result = await rejectProperty(property.id);

            setMessage(`${property.name} — ${result.message}`);
            await load();
        } catch (error: any) {
            setMessage(error.response?.data?.message ?? '반려에 실패했습니다.');
        }
    };

    const handleHide = async (property: AdminProperty) => {
        try {
            const result = property.visible
                ? await hideProperty(property.id)
                : await unhideProperty(property.id);
            setMessage(`${property.name} — ${result.message}`);
            await load();
        } catch (error: any) {
            setMessage(error.response?.data?.message ?? '처리에 실패했습니다.');
        }
    };

    // 로그인·권한 확인과 바깥 레이아웃(히어로·사이드바)은 관리자 콘솔(AdminConsolePage)이 맡는다.
    // 이 화면은 콘솔 오른쪽에 들어가는 패널만 그린다.
    return (
        <>
            <div className="section-head">
                <div>
                    <h2>매물 관리</h2>
                    <p>중개인이 등록한 매물을 승인하면 지도와 중개사무소 화면에 노출됩니다. 오래 기다린 매물이 위에 옵니다.</p>
                </div>
                <span className={`status ${pendingCount > 0 ? 'orange' : 'green'}`}>
                    승인 대기 {pendingCount}건
                </span>
            </div>

            <div className="section-head">
                <div>
                    <h2 style={{ fontSize: 17 }}>매물 목록</h2>
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

            {!loading && properties.length === 0 && (
                <p className="xs dim">해당 조건의 매물이 없습니다.</p>
            )}

            <div className="stack">
                {properties.map((property) => (
                    <div className="card" key={property.id}>
                        <div className="row between">
                            <span className={`status ${STATUS_COLORS[property.status] ?? 'gray'}`}>
                                {property.statusLabel}
                            </span>
                            <span className="xs dim">신청 {property.createdAt}</span>
                        </div>

                        <h3 style={{ marginTop: 10 }}>
                            <Link to={`/property/${property.id}`}>{property.name}</Link>
                        </h3>

                        <p className="xs dim" style={{ marginTop: 6 }}>
                            {property.typeLabel} · {property.priceLabel}
                        </p>
                        <p className="xs dim" style={{ marginTop: 4 }}>
                            {property.address}
                            {property.area ? ` · ${property.area}` : ''}
                            {property.floor != null ? ` · ${property.floor}층` : ''}
                        </p>

                        <div className="divider" style={{ margin: '12px 0' }}></div>

                        {/* 어느 사무소가 올렸는지. 인증되지 않은 사무소는 승인 전에 한 번 더 살펴봐야 한다. */}
                        <div className="row between">
                            <span className="xs dim">
                                {property.agencyId ? (
                                    <Link to={`/agency/${property.agencyId}`}>{property.agencyName}</Link>
                                ) : '사무소 없음'}
                                {property.brokerName ? ` · ${property.brokerName}` : ''}
                            </span>
                            <span className={`status ${property.agencyVerified ? 'green' : 'gray'}`}>
                                {property.agencyVerified ? '인증 사무소' : '미인증 사무소'}
                            </span>
                        </div>

                        {/* 관리자 승인대기 매물 카드에 등록가격·AI 적정시세·수동 가격평가 선택 UI를 추가함 */}
                        <>
                            <div className="divider" style={{ margin: '12px 0' }}></div>

                            <div>
                                <p className="xs" style={{ marginBottom: 6 }}>
                                    <strong>중개인 등록가격</strong> · {property.priceLabel}
                                </p>

                                <p className="xs" style={{ marginBottom: 10 }}>
                                    <strong>AI 적정 시세</strong> · {getAiPriceLabel(property)}
                                </p>

                                {property.status === 'PENDING' && (
                                    <>
                                        <p className="xs dim" style={{ marginBottom: 8 }}>
                                            AI 시세를 참고해 관리자가 직접 가격 상태를 선택합니다.
                                        </p>

                                        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                                            {(
                                                [
                                                    'UNDERVALUED',
                                                    'FAIR',
                                                    'OVERVALUED',
                                                ] as PriceEvaluationStatus[]
                                            ).map((status) => (
                                                <button
                                                    key={status}
                                                    type="button"
                                                    className={
                                                        property.priceEvaluation === status
                                                            ? 'solid-btn'
                                                            : 'outline-btn'
                                                    }
                                                    onClick={() =>
                                                        handlePriceEvaluation(property, status)
                                                    }
                                                >
                                                    {PRICE_EVALUATION_LABELS[status]}
                                                </button>
                                            ))}
                                        </div>
                                    </>
                                )}

                                {property.status !== 'PENDING' && property.priceEvaluation && (
                                    <p className="xs" style={{ marginTop: 8 }}>
                                        관리자 가격평가 ·{' '}
                                        {PRICE_EVALUATION_LABELS[property.priceEvaluation]}
                                    </p>
                                )}
                            </div>
                        </>

                        {/* 승인·반려는 승인 대기 상태에서만 할 수 있다 (서버도 같은 조건으로 막는다) */}
                        {property.status === 'PENDING' && (
                            <div className="row" style={{ gap: 10, marginTop: 16 }}>
                                <button
                                    className="solid-btn"
                                    disabled={!property.priceEvaluation}
                                    onClick={() => handleApprove(property)}
                                >
                                    승인
                                </button>
                                <button className="outline-btn" onClick={() => handleReject(property)}>
                                    반려
                                </button>
                                <button className="outline-btn" onClick={() => handleHide(property)}>
                                    {property.visible ? '비공개 처리' : '공개로 전환'}
                                </button>
                            </div>
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
        </>
    );
}

export default AdminPropertyPage;
