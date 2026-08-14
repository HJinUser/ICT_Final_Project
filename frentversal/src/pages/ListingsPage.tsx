import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { fetchAvailableDealTypes, fetchListings } from '../api/propertySearchApi';
import type { PropertyListingsResponse, PropertySearchItem, PropertySort } from '../types/PropertySearch';
import { PROPERTY_TYPES, SORT_OPTIONS } from '../types/PropertySearch';

// 매물 확인 (기획서 "매물 확인 페이지")
//
// 지도 없이 전체 매물을 카드로 훑어보는 화면이다. 지도 검색(MapSearchPage)과 달리
// 조건은 매물유형 · 거래유형 · 정렬 세 가지뿐이고, 지역 필터는 없다.
// 서버 페이징(GET /property/listings)을 그대로 쓰기 때문에 화면은 항상 "지금 페이지의 6건"만 들고 있는다
// (지도 검색처럼 전체를 받아서 화면에서 자르는 방식이 아니다).
//
// 전용 CSS 파일은 나중에 따로 만들기로 해서, 그때까지 필요한 스타일은 인라인으로 둔다.

const PAGE_SIZE = 6;

// 거래유형 배지 색
const DEAL_TYPE_BADGE: Record<string, string> = {
    SALE: 'green',
    JEONSE: 'purple',
    MONTHLY: 'orange',
};

const DEAL_TYPE_LABELS: Record<string, string> = {
    ALL: '전체',
    SALE: '매매',
    JEONSE: '전세',
    MONTHLY: '월세',
};

const PRICE_LEVEL_LABEL: Record<string, string> = {
    LOW: '시세보다 쌈',
    MID: '시세와 비슷',
    HIGH: '시세보다 비쌈',
};

const PRICE_LEVEL_BADGE: Record<string, string> = {
    LOW: 'green',
    MID: 'gray',
    HIGH: 'orange',
};

const EMPTY: PropertyListingsResponse = { content: [], totalCount: 0, totalPages: 0, page: 0 };

function ListingsPage() {
    // ── 조건 (매물유형 · 거래유형 · 정렬 · 페이지) ─────────────
    const [type, setType] = useState('ALL');
    const [dealType, setDealType] = useState('ALL');
    const [sort, setSort] = useState<PropertySort>('LATEST');
    const [page, setPage] = useState(0);

    // 지금 고른 매물유형에 실제로 존재하는 거래유형 (거래유형 칩을 채운다)
    const [availableDealTypes, setAvailableDealTypes] = useState<string[]>([]);

    const [result, setResult] = useState<PropertyListingsResponse>(EMPTY);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');

    // 매물유형이 바뀌면 그 유형에 실제로 있는 거래유형만 다시 받아온다.
    // 지금 고른 거래유형이 새 목록에 없으면(예: 오피스텔엔 월세가 없음) 전체로 되돌린다.
    useEffect(() => {
        let active = true;

        fetchAvailableDealTypes(type)
            .then((codes) => {
                if (!active) return;
                setAvailableDealTypes(codes);
                setDealType((current) => (current === 'ALL' || codes.includes(current)) ? current : 'ALL');
            })
            .catch(() => { if (active) setAvailableDealTypes([]); });

        return () => { active = false; };
    }, [type]);

    // 목록 조회. 조건이나 페이지가 바뀔 때마다 다시 부른다.
    useEffect(() => {
        let active = true;
        setLoading(true);

        fetchListings({ type, dealType, sort, page, size: PAGE_SIZE })
            .then((data) => {
                if (!active) return;
                setResult(data);
                setMessage('');
            })
            .catch(() => {
                if (!active) return;
                setMessage('매물을 불러오지 못했습니다.');
                setResult(EMPTY);
            })
            .finally(() => { if (active) setLoading(false); });

        return () => { active = false; };
    }, [type, dealType, sort, page]);

    // 매물유형·거래유형·정렬이 바뀌면 1페이지(0)로 되돌린다.
    const changeType = (value: string) => { setType(value); setPage(0); };
    const changeDealType = (value: string) => { setDealType(value); setPage(0); };
    const changeSort = (value: PropertySort) => { setSort(value); setPage(0); };

    const resetFilters = () => {
        setType('ALL');
        setDealType('ALL');
        setSort('LATEST');
        setPage(0);
    };

    const dealTypeOptions = useMemo(() => ['ALL', ...availableDealTypes], [availableDealTypes]);

    // 거래유형을 안 고른 채 가격순 정렬을 골랐다는 안내
    // (서버가 이 조합을 최신순으로 자동 전환하므로, 왜 정렬이 안 먹는 것처럼 보이는지 알려준다)
    const showPriceSortHint = dealType === 'ALL' && (sort === 'PRICE_ASC' || sort === 'PRICE_DESC');

    return (
        <main>
            <section className="page-hero"><div className="wrap">
                <div>
                    <div className="eyebrow">All Listings</div>
                    <h1>매물 확인</h1>
                    <p>지도 없이 새로 등록된 순서대로 전체 매물을 훑어봅니다. 찾을 지역이 아직 정해지지 않았다면 여기서 먼저 둘러보세요.</p>
                </div>
                <div className="hero-stat">
                    <span className="mono dim">전체 매물</span>
                    <strong>{result.totalCount.toLocaleString()}건</strong>
                </div>
            </div></section>

            <section className="section"><div className="wrap">
                {/* 매물 유형 — 하나만 고른다 */}
                <div className="filter-block" style={{ border: 0, padding: '0 0 12px' }}>
                    <h4>매물 유형</h4>
                    <div className="chip-group">
                        {PROPERTY_TYPES.map((item) => (
                            <button
                                className={`filter-chip${type === item.value ? ' on' : ''}`}
                                onClick={() => changeType(item.value)}
                                key={item.value}
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* 거래 유형 — DB에 실제 있는 조합만 보여준다 */}
                <div className="filter-block" style={{ border: 0, padding: '0 0 12px' }}>
                    <h4>거래 유형</h4>
                    <div className="chip-group">
                        {dealTypeOptions.map((code) => (
                            <button
                                className={`filter-chip${dealType === code ? ' on' : ''}`}
                                onClick={() => changeDealType(code)}
                                key={code}
                            >
                                {DEAL_TYPE_LABELS[code]}
                            </button>
                        ))}
                    </div>
                    {showPriceSortHint && (
                        <p className="xs dim" style={{ marginTop: 8 }}>
                            거래 유형을 고르지 않으면 매매·전세·월세 가격을 그대로 비교할 수 없어 최신 등록순으로 보여 드립니다.
                        </p>
                    )}
                </div>

                <div className="toolbar">
                    <span className="grow"></span>
                    <select
                        className="search-box"
                        style={{ maxWidth: 170 }}
                        value={sort}
                        onChange={(event) => changeSort(event.target.value as PropertySort)}
                    >
                        {SORT_OPTIONS.map((item) => (
                            <option value={item.value} key={item.value}>{item.label}</option>
                        ))}
                    </select>
                </div>

                {loading && <p className="xs dim">불러오는 중입니다…</p>}
                {!loading && message && <p className="xs" style={{ color: 'var(--red)' }}>{message}</p>}

                {!loading && !message && result.content.length === 0 && (
                    <div className="soft" style={{ textAlign: 'center', marginTop: 22 }}>
                        조건에 맞는 매물이 없습니다. 필터를 다시 설정해 보세요.
                        <button className="outline-btn" style={{ marginLeft: 8 }} onClick={resetFilters}>초기화</button>
                    </div>
                )}

                {!loading && result.content.length > 0 && (
                    <div className="grid-3" style={{ marginTop: 6 }}>
                        {result.content.map((property) => (
                            <ListingCard property={property} key={property.id} />
                        ))}
                    </div>
                )}

                {result.totalPages > 1 && (
                    <div className="row" style={{ gap: 6, marginTop: 22, justifyContent: 'center' }}>
                        {Array.from({ length: result.totalPages }, (_, index) => (
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

                <p className="xs dim" style={{ textAlign: 'center', marginTop: 24 }}>
                    매물 {result.totalCount}건 · {result.totalPages === 0 ? 1 : page + 1} / {Math.max(result.totalPages, 1)} 페이지
                </p>
            </div></section>
        </main>
    );
}

// 매물 카드 한 장. 목업의 media-card 구조를 그대로 따른다.
function ListingCard({ property }: { property: PropertySearchItem }) {
    return (
        <Link className="media-card" to={`/property/${property.id}`}>
            <div
                className="photo"
                style={property.thumbnailUrl ? { backgroundImage: `url('${property.thumbnailUrl}')` } : undefined}
            />
            <div className="body">
                <div className="row between">
                    <div className="row gap8">
                        <span className={`status ${DEAL_TYPE_BADGE[property.dealType] ?? 'gray'}`}>
                            {DEAL_TYPE_LABELS[property.dealType]}
                        </span>
                        <span className="tag">{property.typeLabel}</span>
                    </div>
                    {property.priceLevel && (
                        <span className={`status ${PRICE_LEVEL_BADGE[property.priceLevel]}`}>
                            {PRICE_LEVEL_LABEL[property.priceLevel]}
                        </span>
                    )}
                </div>

                <h3 style={{ marginTop: 11, fontSize: 17 }}>{property.name}</h3>
                <div className="num" style={{ fontSize: 18, marginTop: 4, color: 'var(--v)' }}>
                    {property.priceLabel}
                </div>
                <p>
                    {property.dong ?? property.gu ?? property.address}
                    {property.areaLabel ? ` · ${property.areaLabel}` : ''}
                    {property.floor != null ? ` · ${property.floor}층` : ''}
                </p>
            </div>
        </Link>
    );
}

export default ListingsPage;