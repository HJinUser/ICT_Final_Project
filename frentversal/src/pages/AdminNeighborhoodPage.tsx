import { useCallback, useEffect, useState } from 'react';

import { createNeighborhood, getNeighborhoodTags, getNeighborhoods } from '../api/neighborhoodApi';
import type { NeighborhoodResponse } from '../types/Neighborhood';
import type { TagResponse } from '../types/Tag';

// 관리자 "동네 등록" 화면
//
// 관리자는 위치(시·군·구/읍·면·동)·소개·이미지 주소·태그만 직접 입력한다.
// 평균 전세가·인기도는 저장하지 않고, 서버가 매물·찜 테이블을 집계해서 보여 준다
// (NeighborhoodService 참고) — 그래서 이 폼에는 그 두 칸이 없다.
// 태그 자동 생성(머신러닝)은 아직 없어서, 있는 태그 중에서 직접 고른다.

const FIXED_CITY = '서울시';

const EMPTY_FORM = {
    district: '',
    dong: '',
    description: '',
    imageUrl: '',
};

function formatJeonsePrice(price: number) {
    if (price <= 0) return '정보 없음';
    const eok = Math.floor(price / 10_000);
    const remainder = price % 10_000;
    if (eok === 0) return `${remainder.toLocaleString()}만 원`;
    return remainder === 0 ? `${eok}억 원` : `${eok}억 ${remainder.toLocaleString()}만 원`;
}

function AdminNeighborhoodPage() {
    const [form, setForm] = useState(EMPTY_FORM);
    const [tags, setTags] = useState<TagResponse[]>([]);
    const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');

    const [neighborhoods, setNeighborhoods] = useState<NeighborhoodResponse[]>([]);
    const [loading, setLoading] = useState(true);

    const loadNeighborhoods = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getNeighborhoods({ includeHidden: true });
            setNeighborhoods(data.content);
        } catch (error: any) {
            setMessage(error.response?.data?.message ?? '동네 목록을 불러오지 못했습니다.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        getNeighborhoodTags().then(setTags).catch(() => setTags([]));
        loadNeighborhoods();
    }, [loadNeighborhoods]);

    const toggleTag = (tagId: number) => {
        setSelectedTagIds((previous) => (
            previous.includes(tagId) ? previous.filter((id) => id !== tagId) : [...previous, tagId]
        ));
    };

    const handleSubmit = async () => {
        if (!form.district.trim() || !form.dong.trim()) {
            setMessage('시·군·구와 읍·면·동을 입력해 주세요.');
            return;
        }

        setSaving(true);
        try {
            const created = await createNeighborhood({
                city: FIXED_CITY,
                district: form.district.trim(),
                dong: form.dong.trim(),
                description: form.description.trim(),
                imageUrl: form.imageUrl.trim(),
                tagIds: selectedTagIds,
            });
            setMessage(`${created.district} ${created.dong} 등록을 완료했습니다.`);
            setForm(EMPTY_FORM);
            setSelectedTagIds([]);
            await loadNeighborhoods();
        } catch (error: any) {
            setMessage(error.response?.data?.message ?? '동네 등록에 실패했습니다.');
        } finally {
            setSaving(false);
        }
    };

    // 로그인·권한 확인과 바깥 레이아웃(히어로·사이드바)은 관리자 콘솔(AdminConsolePage)이 맡는다.
    return (
        <>
            <div className="section-head">
                <div>
                    <h2>동네 관리</h2>
                    <p>위치·소개·이미지만 입력하면, 평균 전세가·인기도·매물 수는 등록된 매물과 찜을 기준으로 자동 계산됩니다.</p>
                </div>
            </div>

            {message && <p className="xs" style={{ marginBottom: 16, color: 'var(--v)' }}>{message}</p>}

            <div className="card" style={{ marginBottom: 24 }}>
                <div className="grid-3">
                    <div className="field">
                        <label>시·도</label>
                        <input type="text" value={FIXED_CITY} disabled />
                    </div>
                    <div className="field">
                        <label>시·군·구</label>
                        <input
                            type="text"
                            placeholder="예) 서초구"
                            value={form.district}
                            onChange={(event) => setForm((previous) => ({ ...previous, district: event.target.value }))}
                        />
                    </div>
                    <div className="field">
                        <label>읍·면·동</label>
                        <input
                            type="text"
                            placeholder="예) 반포동"
                            value={form.dong}
                            onChange={(event) => setForm((previous) => ({ ...previous, dong: event.target.value }))}
                        />
                    </div>
                </div>

                <div className="field">
                    <label>동네 소개</label>
                    <textarea
                        placeholder="이 동네의 특징을 소개해 주세요"
                        value={form.description}
                        onChange={(event) => setForm((previous) => ({ ...previous, description: event.target.value }))}
                    />
                </div>

                <div className="field">
                    <label>이미지 주소</label>
                    <input
                        type="text"
                        placeholder="https://..."
                        value={form.imageUrl}
                        onChange={(event) => setForm((previous) => ({ ...previous, imageUrl: event.target.value }))}
                    />
                </div>

                <div className="field">
                    <label>태그 (있는 태그 중에서 선택 — 자동 생성은 아직 지원하지 않습니다)</label>
                    <div className="neighborhood-tag-buttons">
                        {tags.map((tag) => (
                            <button
                                key={tag.id}
                                type="button"
                                className={`filter-chip${selectedTagIds.includes(tag.id) ? ' on' : ''}`}
                                onClick={() => toggleTag(tag.id)}
                            >
                                {tag.name}
                            </button>
                        ))}
                    </div>
                </div>

                <button className="solid-btn" style={{ marginTop: 16 }} onClick={handleSubmit} disabled={saving}>
                    {saving ? '등록 중…' : '동네 등록'}
                </button>
            </div>

            <div className="section-head">
                <div>
                    <h2 style={{ fontSize: 17 }}>등록된 동네</h2>
                    <p>평균 전세가·인기도·매물 수는 실시간 집계 값입니다.</p>
                </div>
            </div>

            {loading && <p className="xs dim">불러오는 중입니다…</p>}
            {!loading && neighborhoods.length === 0 && <p className="xs dim">등록된 동네가 없습니다.</p>}

            <div className="stack">
                {neighborhoods.map((neighborhood) => (
                    <div className="card" key={neighborhood.id}>
                        <div className="row between">
                            <h3>{neighborhood.city} {neighborhood.district} {neighborhood.dong}</h3>
                            {!neighborhood.visible && <span className="status gray">숨김</span>}
                        </div>
                        <p className="xs dim" style={{ marginTop: 6 }}>{neighborhood.description || '동네 소개가 없습니다.'}</p>
                        <div className="grid-3" style={{ marginTop: 12 }}>
                            <div className="soft">
                                <span className="xs dim">평균 전세가</span>
                                <strong style={{ display: 'block', marginTop: 5 }}>{formatJeonsePrice(neighborhood.averageJeonsePrice)}</strong>
                            </div>
                            <div className="soft">
                                <span className="xs dim">매물 수</span>
                                <strong style={{ display: 'block', marginTop: 5 }}>{neighborhood.propertyCount}건</strong>
                            </div>
                            <div className="soft">
                                <span className="xs dim">인기도(찜 합계)</span>
                                <strong style={{ display: 'block', marginTop: 5 }}>{neighborhood.popularityScore}</strong>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </>
    );
}

export default AdminNeighborhoodPage;
