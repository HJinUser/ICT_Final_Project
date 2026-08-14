import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import {
    getNeighborhoods,
    getNeighborhoodTags,
    toggleNeighborhoodVisibility,
} from '../api/neighborhoodApi';
import type {
    NeighborhoodListResponse,
    NeighborhoodSearchParams,
    NeighborhoodSortCode,
} from '../types/Neighborhood';
import type { TagCategoryCode, TagResponse } from '../types/Tag';
import type { User } from '../types/User';
import { SEOUL_DISTRICTS, dongsOf } from '../utils/seoulDistricts';
import '../assets/common.css';
import '../assets/responsive.css';
import '../components/Neighborhood.css';

interface NeighborhoodPageProps {
    user: User | null;
}

const EMPTY_RESPONSE: NeighborhoodListResponse = {
    content: [],
    totalCount: 0,
    cities: [],
    districtsByCity: {},
    dongsByDistrict: {},
};

const CATEGORY_LABELS: Record<TagCategoryCode, string> = {
    ATMOSPHERE: '분위기',
    LIVING_ENVIRONMENT: '생활환경',
    TRANSPORTATION: '교통 편의',
    NATURAL_ENVIRONMENT: '자연환경',
};

const CATEGORIES = Object.keys(CATEGORY_LABELS) as TagCategoryCode[];
const PAGE_SIZE = 6;

// 이 서비스는 서울만 다룬다. 시/도를 고를 필요가 없어서 항상 이 값으로 고정한다.
const FIXED_CITY = '서울시';

function formatJeonsePrice(price: number) {
    if (price <= 0) return '정보 없음';
    const eok = Math.floor(price / 10_000);
    const remainder = price % 10_000;
    if (eok === 0) return `${remainder.toLocaleString()}만 원`;
    if (remainder === 0) return `${eok}억 원`;
    return `${eok}억 ${remainder.toLocaleString()}만 원`;
}

function NeighborhoodPage({ user }: NeighborhoodPageProps) {
    const [result, setResult] = useState<NeighborhoodListResponse>(EMPTY_RESPONSE);
    const [tags, setTags] = useState<TagResponse[]>([]);
    const [activeCategory, setActiveCategory] = useState<TagCategoryCode>('ATMOSPHERE');
    const [search, setSearch] = useState<Required<Pick<NeighborhoodSearchParams, 'tagIds' | 'sort' | 'includeHidden'>> & NeighborhoodSearchParams>({
        city: FIXED_CITY, district: '', dong: '', tagIds: [], sort: 'POPULAR', includeHidden: false,
    });
    const [draftDistrict, setDraftDistrict] = useState('');
    const [draftDong, setDraftDong] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [page, setPage] = useState(1);

    useEffect(() => {
        let active = true;
        const loadTags = async () => {
            try {
                const data = await getNeighborhoodTags();
                if (active) setTags(data);
            } catch (requestError) {
                console.error('동네 태그 조회 실패', requestError);
                if (active) setError('동네 태그를 불러오지 못했습니다.');
            }
        };
        loadTags();
        return () => { active = false; };
    }, []);

    useEffect(() => {
        let active = true;
        const loadNeighborhoods = async () => {
            setLoading(true);
            setError('');
            try {
                const data = await getNeighborhoods(search);
                if (active) {
                    setResult(data);
                    setPage(1);
                }
            } catch (requestError) {
                console.error('동네 탐색 조회 실패', requestError);
                if (active) setError('동네 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
            } finally {
                if (active) setLoading(false);
            }
        };
        loadNeighborhoods();
        return () => { active = false; };
    }, [search]);

    const categoryTags = useMemo(
        () => tags.filter((tag) => tag.category === activeCategory),
        [tags, activeCategory],
    );
    const selectedTags = useMemo(
        () => tags.filter((tag) => search.tagIds.includes(tag.id)),
        [tags, search.tagIds],
    );
    // 구·동 목록은 서버가 준 값(= 이미 등록된 동네가 있는 지역)이 아니라 서울시 전체를 보여 준다.
    // 등록된 동네만 고를 수 있으면 "아직 등록 안 된 동네"를 찾아볼 방법이 없고,
    // 화면마다 고를 수 있는 지역이 달라 보이기 때문이다(utils/seoulDistricts 를 함께 쓴다).
    const districts = SEOUL_DISTRICTS;
    const dongs = dongsOf(draftDistrict);
    const pageCount = Math.max(1, Math.ceil(result.content.length / PAGE_SIZE));
    const pagedNeighborhoods = result.content.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    const toggleTag = (tagId: number) => {
        setSearch((previous) => ({
            ...previous,
            tagIds: previous.tagIds.includes(tagId)
                ? previous.tagIds.filter((id) => id !== tagId)
                : [...previous.tagIds, tagId],
        }));
    };

    const applyLocation = () => {
        setSearch((previous) => ({
            ...previous,
            city: FIXED_CITY,
            district: draftDistrict,
            dong: draftDong,
        }));
    };

    const handleVisibility = async (id: number) => {
        try {
            await toggleNeighborhoodVisibility(id);
            setSearch((previous) => ({ ...previous }));
        } catch (requestError) {
            console.error('동네 공개 상태 변경 실패', requestError);
            setError('동네 공개 상태를 변경하지 못했습니다.');
        }
    };

    return (
        <main className="neighborhood-page">
            <section className="page-hero neighborhood-hero"><div className="wrap">
                <div>
                    <div className="eyebrow">Neighborhood explorer</div>
                    <h1>동네 탐색</h1>
                    <p>지역과 생활 태그를 조합해 나에게 맞는 동네를 찾아보세요.</p>
                </div>
                <div className="hero-stat">
                    <span className="mono dim">검색 결과</span>
                    <strong>{result.totalCount}곳</strong>
                    <span className="xs dim">DB 연동 기준</span>
                </div>
            </div></section>

            <section className="section"><div className="wrap neighborhood-wrap">
                <section className="neighborhood-filter-card">
                    <div className="neighborhood-location-fields">
                        <label>시·도<input type="text" value={FIXED_CITY} disabled /></label>
                        <label>시·군·구<select value={draftDistrict} onChange={(event) => { setDraftDistrict(event.target.value); setDraftDong(''); }}>
                            <option value="">전체</option>
                            {districts.map((district) => <option key={district} value={district}>{district}</option>)}
                        </select></label>
                        <label>읍·면·동<select value={draftDong} onChange={(event) => setDraftDong(event.target.value)} disabled={!draftDistrict}>
                            <option value="">전체</option>
                            {dongs.map((dong) => <option key={dong} value={dong}>{dong}</option>)}
                        </select></label>
                        <button className="solid-btn" type="button" onClick={applyLocation}>필터 적용</button>
                    </div>

                    <div className="neighborhood-tag-area">
                        <div className="tabs neighborhood-tabs">
                            {CATEGORIES.map((category) => (
                                <button className={`tab-btn${activeCategory === category ? ' on' : ''}`} type="button" onClick={() => setActiveCategory(category)} key={category}>
                                    {CATEGORY_LABELS[category]}
                                </button>
                            ))}
                        </div>
                        <div className="neighborhood-tag-buttons">
                            {categoryTags.map((tag) => (
                                <button className={`filter-chip${search.tagIds.includes(tag.id) ? ' on' : ''}`} type="button" onClick={() => toggleTag(tag.id)} key={tag.id}>
                                    {tag.name}
                                </button>
                            ))}
                        </div>
                        {selectedTags.length > 0 && <div className="neighborhood-selected-tags">
                            <span>선택한 태그</span>
                            {selectedTags.map((tag) => <button type="button" onClick={() => toggleTag(tag.id)} key={tag.id}>{tag.name} ×</button>)}
                        </div>}
                    </div>
                </section>

                <div className="neighborhood-toolbar">
                    <p className="muted">조건에 맞는 동네 {result.totalCount}곳</p>
                    <div className="row gap12">
                        {user?.role === 'ADMIN' && <label className="neighborhood-hidden-toggle">
                            <input type="checkbox" checked={search.includeHidden} onChange={(event) => setSearch((previous) => ({ ...previous, includeHidden: event.target.checked }))} /> 숨김 포함
                        </label>}
                        <select className="search-box" value={search.sort} onChange={(event) => setSearch((previous) => ({ ...previous, sort: event.target.value as NeighborhoodSortCode }))}>
                            <option value="POPULAR">인기 순</option>
                            <option value="LISTINGS">매물 많은 순</option>
                            <option value="NAME">가나다순</option>
                        </select>
                    </div>
                </div>

                {loading && <div className="neighborhood-state">동네 정보를 불러오는 중입니다.</div>}
                {!loading && error && <div className="neighborhood-state error">{error}</div>}
                {!loading && !error && result.content.length === 0 && <div className="neighborhood-state">선택한 조건에 맞는 동네가 없습니다.</div>}
                {!loading && !error && <div className="neighborhood-grid">
                    {pagedNeighborhoods.map((neighborhood) => (
                        <article className={`neighborhood-card${neighborhood.visible ? '' : ' hidden-card'}`} key={neighborhood.id}>
                            <Link to={`/neighborhood/${neighborhood.id}`}>
                                <div
                                    className="neighborhood-visual"
                                    style={neighborhood.imageUrl ? { backgroundImage: `url('${neighborhood.imageUrl}')` } : undefined}
                                >
                                    {!neighborhood.imageUrl && <strong>{neighborhood.dong.slice(0, 2)}</strong>}
                                    {!neighborhood.visible && <span className="status gray">숨김</span>}
                                </div>
                                <div className="neighborhood-card-body">
                                    <div className="row between">
                                        <div><span className="xs dim">{neighborhood.city} {neighborhood.district}</span><h2>{neighborhood.dong}</h2></div>
                                    </div>
                                    <p>{neighborhood.description || '등록된 동네 소개가 없습니다.'}</p>
                                    <div className="neighborhood-card-tags">
                                        {neighborhood.tags.slice(0, 3).map((tag) => <span key={tag.id}>#{tag.name}</span>)}
                                    </div>
                                    <dl className="neighborhood-stats">
                                        <div><dt>평균 전세</dt><dd>{formatJeonsePrice(neighborhood.averageJeonsePrice)}</dd></div>
                                        <div><dt>매물</dt><dd>{neighborhood.propertyCount}건</dd></div>
                                    </dl>
                                </div>
                            </Link>
                            {user?.role === 'ADMIN' && <div className="neighborhood-admin-actions">
                                <button className="danger-btn" type="button" onClick={() => handleVisibility(neighborhood.id)}>{neighborhood.visible ? '숨김' : '공개'}</button>
                                <Link className="outline-btn" to={`/neighborhood/${neighborhood.id}`}>수정 화면</Link>
                            </div>}
                        </article>
                    ))}
                </div>}
                {!loading && !error && pageCount > 1 && <nav className="neighborhood-pagination" aria-label="동네 목록 페이지">
                    <button type="button" disabled={page === 1} onClick={() => setPage((current) => current - 1)}>이전</button>
                    {Array.from({ length: pageCount }, (_, index) => index + 1).map((pageNumber) => (
                        <button className={page === pageNumber ? 'active' : ''} type="button" onClick={() => setPage(pageNumber)} key={pageNumber}>{pageNumber}</button>
                    ))}
                    <button type="button" disabled={page === pageCount} onClick={() => setPage((current) => current + 1)}>다음</button>
                </nav>}
            </div></section>
        </main>
    );
}

export default NeighborhoodPage;
