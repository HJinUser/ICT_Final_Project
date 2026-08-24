import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { getAdminMlStatus } from '../api/adminApi';
import type { AdminMlStatus, MlSalePriceStatus } from '../types/Admin';
import { navigateOrNotice } from '../utils/navigateOrNotice';

// 관리자 "모델 관리" 화면
//
// FastAPI 쪽에서 학습해 둔 시세예측 모델과, Spring 쪽에서 집계하는 추천 통계를
// AdminMlController(/admin/ml/status)가 한 번에 합쳐 주므로 이 화면은 그 값을 그대로 카드로 보여 준다.
// 배포를 바꾸거나 재학습을 트리거하는 화면은 아니고, 지금 서비스 중인 모델의 상태를 확인하는 용도다.

// "2026-08-18T14:21:30" 처럼 오는 학습 시각에서 날짜만 뽑는다. 값이 없으면 '-'.
function toDate(value: string | null | undefined): string {
    if (!value) return '-';
    return value.split('T')[0];
}

function AdminMlPage() {
    const navigate = useNavigate();

    const [status, setStatus] = useState<AdminMlStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');

    const load = useCallback(async () => {
        setLoading(true);

        try {
            setStatus(await getAdminMlStatus());
        } catch (error: any) {
            setMessage(error.response?.data?.message ?? 'ML 모델 상태를 불러오지 못했습니다.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    // 로그인·권한 확인과 바깥 레이아웃(히어로·사이드바)은 관리자 콘솔(AdminConsolePage)이 맡는다.
    // 이 화면은 콘솔 오른쪽에 들어가는 패널만 그린다.
    return (
        <>
            <div className="section-head">
                <div>
                    <h2>모델 관리</h2>
                    <p>시세예측·맞춤 추천·동네 분석에 쓰는 모델의 현재 상태를 확인합니다.</p>
                </div>
                <button
                    className="outline-btn"
                    onClick={() => navigateOrNotice({ label: '전체 성능 리포트', path: '/report', ready: false }, navigate)}
                >
                    전체 성능 리포트
                </button>
            </div>

            {message && <p className="xs" style={{ marginBottom: 16, color: 'var(--v)' }}>{message}</p>}

            {loading && <p className="xs dim">불러오는 중입니다…</p>}

            {!loading && status && (
                <div className="grid-3">
                    <PriceModelCard title="매매(SALE) 시세예측" model={status.offline.price.sale} unit="매매가" />
                    <PriceModelCard title="전세(JEONSE) 시세예측" model={status.offline.price.jeonse} unit="전세가" />

                    {/* 월세는 보증금·월세 두 값을 함께 예측하므로 카드 구성이 다르다 */}
                    <section className="model-card">
                        <span className="status green">운영 중</span>
                        <h3 style={{ marginTop: 11 }}>월세(MONTHLY) 시세예측</h3>
                        <div className="model-score">{status.offline.price.monthly.metrics.deposit.r2.toFixed(2)} R² (보증금)</div>
                        <p className="xs dim">
                            보증금 MAE {status.offline.price.monthly.metrics.deposit.mae.toLocaleString(undefined, { maximumFractionDigits: 0 })}만원
                            · 월세 MAE {status.offline.price.monthly.metrics.rent.mae.toLocaleString(undefined, { maximumFractionDigits: 0 })}만원
                        </p>
                        <p className="xs dim" style={{ marginTop: 4 }}>
                            {status.offline.price.monthly.selected_model} · 학습 {status.offline.price.monthly.rows.toLocaleString()}건
                            · {toDate(status.offline.price.monthly.trained_at)} 학습
                        </p>
                    </section>

                    <section className="model-card">
                        <span className={`status ${status.recommendation.fitRate === '' ? 'gray' : 'green'}`}>
                            {status.recommendation.fitRate === '' ? '평가 없음' : '운영 중'}
                        </span>
                        <h3 style={{ marginTop: 11 }}>맞춤 추천</h3>
                        <div className="model-score">
                            {status.recommendation.fitRate === '' ? '-' : `${status.recommendation.fitRate}%`}
                        </div>
                        <p className="xs dim">
                            평가 {status.recommendation.likeCount + status.recommendation.dislikeCount}건
                            · 👍 {status.recommendation.likeCount} / 👎 {status.recommendation.dislikeCount}
                        </p>
                        <p className="xs dim" style={{ marginTop: 4 }}>모델 {status.recommendation.modelVersion}</p>
                    </section>

                    <section className="model-card">
                        <span className={`status ${status.offline.clustering.neighborhoodCount > 0 ? 'green' : 'gray'}`}>
                            {status.offline.clustering.neighborhoodCount > 0 ? '운영 중' : '분석 전'}
                        </span>
                        <h3 style={{ marginTop: 11 }}>동네 군집분석 (K-Means)</h3>
                        <div className="model-score">
                            {status.offline.clustering.selectedK == null ? '-' : `K=${status.offline.clustering.selectedK}`}
                        </div>
                        <p className="xs dim">행정동 {status.offline.clustering.neighborhoodCount}개</p>
                        <p className="xs dim" style={{ marginTop: 4 }}>분석일 {toDate(status.offline.clustering.analyzedAt)}</p>
                    </section>

                    <section className="model-card">
                        <span className={`status ${status.offline.textMining.documentCount > 0 ? 'green' : 'gray'}`}>
                            {status.offline.textMining.documentCount > 0 ? '운영 중' : '분석 전'}
                        </span>
                        <h3 style={{ marginTop: 11 }}>동네 텍스트마이닝</h3>
                        <div className="model-score">{status.offline.textMining.documentCount.toLocaleString()}건</div>
                        <p className="xs dim">분석 동네 {status.offline.textMining.neighborhoodCount}개</p>
                        <p className="xs dim" style={{ marginTop: 4 }}>분석일 {toDate(status.offline.textMining.analyzedAt)}</p>
                    </section>
                </div>
            )}
        </>
    );
}

// 매매·전세 카드는 구조가 같아서 하나로 뺐다 (월세는 보증금/월세 두 값이라 따로 그린다).
function PriceModelCard({ title, model, unit }: { title: string; model: MlSalePriceStatus; unit: string }) {
    return (
        <section className="model-card">
            <span className="status green">운영 중</span>
            <h3 style={{ marginTop: 11 }}>{title}</h3>
            <div className="model-score">{model.metrics.r2.toFixed(2)} R²</div>
            <p className="xs dim">{unit} MAE {model.metrics.mae.toLocaleString(undefined, { maximumFractionDigits: 0 })}만원</p>
            <p className="xs dim" style={{ marginTop: 4 }}>
                {model.selected_model} · 학습 {model.rows.toLocaleString()}건 · {toDate(model.trained_at)} 학습
            </p>
        </section>
    );
}

export default AdminMlPage;
