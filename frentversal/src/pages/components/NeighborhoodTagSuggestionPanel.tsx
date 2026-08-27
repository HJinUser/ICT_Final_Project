/*
  한줄평 텍스트마이닝이 뽑은 동네 태그 후보를 관리자가 검토하는 영역.

  자동으로 붙이지 않고 관리자가 확인한 뒤 반영하는 이유가 있다.
  후보 대부분이 한줄평 1건에서 뽑은 것이라, 한 사람의 인상이 그대로 동네 태그가 되면 안 된다.
  그래서 근거가 된 낱말과 한줄평 수를 함께 보여 주고, 관리자가 고른 것만 반영한다.

  체크 상태의 최종 목록을 통째로 보내므로, 이미 붙어 있던 태그를 여기서 뗄 수도 있다.
*/

import { useCallback, useEffect, useState } from 'react';

import { getNeighborhoodTagSuggestions, updateNeighborhoodTags } from '../../api/neighborhoodApi';
import type { NeighborhoodTagReview } from '../../types/NeighborhoodTagSuggestion';
import '../../styles/NeighborhoodTagSuggestionPanel.css';

interface Props {
    // 태그를 반영한 뒤 바깥 목록도 다시 읽게 한다.
    onApplied?: () => void;
}

function NeighborhoodTagSuggestionPanel({ onApplied }: Props) {
    const [reviews, setReviews] = useState<NeighborhoodTagReview[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // 동네별로 지금 체크된 태그 id 모음. 처음에는 이미 붙어 있는 것만 켜 둔다.
    const [checked, setChecked] = useState<Record<number, Set<number>>>({});
    const [savingId, setSavingId] = useState<number | null>(null);
    const [notice, setNotice] = useState<{ text: string; ok: boolean } | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const data = await getNeighborhoodTagSuggestions();
            setReviews(data);

            const initial: Record<number, Set<number>> = {};
            data.forEach((review) => {
                initial[review.neighborhoodId] = new Set(
                    review.suggestions.filter((s) => s.alreadyApplied).map((s) => s.tagId),
                );
            });
            setChecked(initial);
        } catch (requestError) {
            console.error('동네 태그 추천 조회 실패', requestError);
            setError('태그 추천을 불러오지 못했습니다. 분석 서버가 꺼져 있을 수 있습니다.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const toggle = (neighborhoodId: number, tagId: number) => {
        setChecked((previous) => {
            const current = new Set(previous[neighborhoodId] ?? []);
            if (current.has(tagId)) current.delete(tagId);
            else current.add(tagId);
            return { ...previous, [neighborhoodId]: current };
        });
    };

    const apply = async (review: NeighborhoodTagReview) => {
        setSavingId(review.neighborhoodId);
        setNotice(null);
        try {
            /*
              이 화면은 추천 태그만 다루는데 반영은 목록을 통째로 바꾸는 방식이다.
              그래서 추천에 없는 기존 태그(관리자가 직접 붙인 것)를 빼고 보내면 그것까지 지워진다.
              추천 밖의 태그는 지금 상태 그대로 두고, 추천 태그만 체크 상태로 갈아 끼운다.
            */
            const suggestedIds = new Set(review.suggestions.map((s) => s.tagId));
            const untouchedIds = review.currentTagIds.filter((tagId) => !suggestedIds.has(tagId));
            const selectedIds = [...(checked[review.neighborhoodId] ?? [])];

            await updateNeighborhoodTags(
                review.neighborhoodId,
                [...new Set([...untouchedIds, ...selectedIds])],
            );

            setNotice({ text: `${review.district} ${review.dong}의 태그를 반영했습니다.`, ok: true });
            onApplied?.();
            await load();
        } catch (requestError: any) {
            console.error('동네 태그 반영 실패', requestError);
            setNotice({
                text: requestError.response?.data?.message ?? '태그를 반영하지 못했습니다.',
                ok: false,
            });
        } finally {
            setSavingId(null);
        }
    };

    return (
        <section className="hoodtag">
            <div className="section-head">
                <div>
                    <h2 style={{ fontSize: 17 }}>AI 태그 추천 (한줄평 분석)</h2>
                    <p>
                        동네 한줄평을 형태소 분석·TF-IDF로 훑어 뽑은 태그 후보입니다.
                        자동으로 붙지 않으니 근거를 확인하고 직접 골라 반영해 주세요.
                    </p>
                </div>
            </div>

            {notice && (
                <p className="hoodtag-notice" role="status" data-kind={notice.ok ? 'done' : 'error'}>
                    <span aria-hidden="true">{notice.ok ? '✓' : '!'}</span>
                    {notice.text}
                </p>
            )}

            {loading && <p className="xs dim">태그 추천을 불러오는 중입니다…</p>}
            {!loading && error && <p className="hoodtag-notice" data-kind="error">{error}</p>}
            {!loading && !error && reviews.length === 0 && (
                <p className="xs dim">
                    아직 반영할 태그 후보가 없습니다. 등록된 동네에 한줄평이 쌓이면 후보가 생깁니다.
                </p>
            )}

            <div className="stack">
                {reviews.map((review) => {
                    const selected = checked[review.neighborhoodId] ?? new Set<number>();

                    return (
                        <div className="card hoodtag-card" key={review.neighborhoodId}>
                            <div className="row between">
                                <h3>{review.district} {review.dong}</h3>
                                <span className="xs dim">
                                    행정동 {review.adminName} · 한줄평 {review.reviewDocumentCount}건
                                </span>
                            </div>

                            {/* 한줄평 1건이면 한 사람 의견이라는 뜻이라 그대로 믿으면 안 된다. */}
                            {review.reviewDocumentCount <= 1 && (
                                <p className="hoodtag-warn">
                                    한줄평이 {review.reviewDocumentCount}건뿐이라 근거가 얕습니다. 반영 전에 꼭 확인해 주세요.
                                </p>
                            )}

                            <div className="hoodtag-list">
                                {review.suggestions.map((suggestion) => (
                                    <label className="hoodtag-item" key={suggestion.tagId}>
                                        <input
                                            type="checkbox"
                                            checked={selected.has(suggestion.tagId)}
                                            onChange={() => toggle(review.neighborhoodId, suggestion.tagId)}
                                        />
                                        <span className="hoodtag-name">
                                            {suggestion.tagName}
                                            {suggestion.alreadyApplied && <em className="hoodtag-applied">반영됨</em>}
                                        </span>
                                        <span className="hoodtag-evidence">
                                            근거: {suggestion.evidence.join(', ')}
                                        </span>
                                    </label>
                                ))}
                            </div>

                            <button
                                className="solid-btn"
                                type="button"
                                style={{ marginTop: 14 }}
                                disabled={savingId === review.neighborhoodId}
                                onClick={() => apply(review)}
                            >
                                {savingId === review.neighborhoodId ? '반영 중…' : '고른 태그 반영'}
                            </button>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}

export default NeighborhoodTagSuggestionPanel;
