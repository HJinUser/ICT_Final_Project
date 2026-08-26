import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { fetchAvailableDealTypes, fetchListings } from '../api/propertySearchApi';
import type {
    PropertyListingsResponse,
    PropertySearchItem,
    PropertySort,
    PropertyVisibility,
} from '../types/PropertySearch';
import { PROPERTY_TYPES, PROPERTY_VISIBILITIES, SORT_OPTIONS } from '../types/PropertySearch';
import type { User } from '../types/User';
import '../styles/ListingsPage.css';

// 매물 확인 (기획서 "매물 확인 페이지")
//
// 지도 없이 전체 매물을 카드로 훑어보는 화면이다. 지도 검색(MapSearchPage)과 달리
// 조건은 매물유형 · 거래유형 · 정렬 세 가지뿐이고, 지역 필터는 없다.
// 서버 페이징(GET /property/listings)을 그대로 쓰기 때문에 화면은 항상 "지금 페이지의 6건"만 들고 있는다.
//
// 관리자에게는 여기에 "공개 여부" 필터가 하나 더 보인다.
// 관리자가 내려 둔 숨김 매물을 다시 찾을 곳이 필요해서다. 이 필터는 관리자에게만 그려지고,
// 서버(PropertyService.browseListings)도 관리자가 아니면 공개 매물만 내려 준다.

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

const PRICE_EVALUATION_LABEL: Record<string, string> = {
    UNDERVALUED: '저평가',
    FAIR: '적정',
    OVERVALUED: '고평가',
};

const PRICE_EVALUATION_BADGE: Record<string, string> = {
    UNDERVALUED: 'green',
    FAIR: 'gray',
    OVERVALUED: 'orange',
};

const EMPTY: PropertyListingsResponse = {
    content: [],
    totalCount: 0,
    totalPages: 0,
    page: 0,
    visibility: 'VISIBLE',
};

interface ListingsPageProps {
    user: User | null;
}

function ListingsPage({ user }: ListingsPageProps) {
    const isAdmin = user?.role === 'ADMIN';

    const [type, setType] = useState('ALL');
    const [dealType, setDealType] = useState('ALL');
    const [sort, setSort] = useState<PropertySort>('LATEST');
    const [page, setPage] = useState(0);

    // 공개 여부. 관리자는 숨김 매물까지 함께 보는 '전체'로 시작한다.
    // 관리자가 아니면 이 값을 바꿀 수단이 화면에 없고, 보내더라도 서버가 공개 매물만 내려 준다.
    const [visibility, setVisibility] = useState<PropertyVisibility>('ALL');

    const [availableDealTypes, setAvailableDealTypes] = useState<string[]>([]);

    const [result, setResult] = useState<PropertyListingsResponse>(EMPTY);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');

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
        // 관리자에게는 숨김 매물의 거래유형까지 내려오므로, 로그인 정보가 채워지면 다시 읽는다.
    }, [type, isAdmin]);

    useEffect(() => {
        let active = true;
        setLoading(true);

        // 공개 여부는 관리자만 고를 수 있다. 관리자가 아니면 아예 보내지 않고 서버 기본값에 맡긴다.
        fetchListings({
            type,
            dealType,
            sort,
            page,
            size: PAGE_SIZE,
            visibility: isAdmin ? visibility : undefined,
        })
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
    }, [type, dealType, sort, page, visibility, isAdmin]);

    const changeType = (value: string) => { setType(value); setPage(0); };
    const changeDealType = (value: string) => { setDealType(value); setPage(0); };
    const changeSort = (value: PropertySort) => { setSort(value); setPage(0); };
    const changeVisibility = (value: PropertyVisibility) => { setVisibility(value); setPage(0); };

    const resetFilters = () => {
        setType('ALL');
        setDealType('ALL');
        setSort('LATEST');
        setVisibility('ALL');
        setPage(0);
    };

    const dealTypeOptions = useMemo(() => ['ALL', ...availableDealTypes], [availableDealTypes]);

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
                <div className="filter-block listings-filter-block">
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

                <div className="filter-block listings-filter-block">
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
                        <p className="xs dim listings-hint">
                            거래 유형을 고르지 않으면 매매·전세·월세 가격을 그대로 비교할 수 없어 최신 등록순으로 보여 드립니다.
                        </p>
                    )}
                </div>

                {/* 공개 여부는 관리자에게만 보인다. 숨김 매물은 관리자가 내려 둔 매물이라
                    사용자 화면에 나오면 안 되고, 서버도 관리자가 아니면 공개 매물만 내려 준다. */}
                {isAdmin && (
                    <div className="filter-block listings-filter-block">
                        <h4>공개 여부</h4>
                        <div className="chip-group">
                            {PROPERTY_VISIBILITIES.map((item) => (
                                <button
                                    className={`filter-chip${visibility === item.value ? ' on' : ''}`}
                                    onClick={() => changeVisibility(item.value)}
                                    key={item.value}
                                >
                                    {item.label}
                                </button>
                            ))}
                        </div>
                        <p className="xs dim listings-hint">
                            숨김 매물은 관리자에게만 보입니다. 매물 상세에서 다시 공개로 전환할 수 있습니다.
                        </p>
                    </div>
                )}

                <div className="toolbar">
                    <span className="grow"></span>
                    <select
                        className="search-box listings-sort-select"
                        value={sort}
                        onChange={(event) => changeSort(event.target.value as PropertySort)}
                    >
                        {SORT_OPTIONS.map((item) => (
                            <option value={item.value} key={item.value}>{item.label}</option>
                        ))}
                    </select>
                </div>

                {loading && <p className="xs dim">불러오는 중입니다…</p>}
                {!loading && message && <p className="xs listings-message">{message}</p>}

                {!loading && !message && result.content.length === 0 && (
                    <div className="soft listings-empty">
                        조건에 맞는 매물이 없습니다. 필터를 다시 설정해 보세요.
                        <button className="outline-btn" onClick={resetFilters}>초기화</button>
                    </div>
                )}

                {!loading && result.content.length > 0 && (
                    <div className="grid-3 listings-grid">
                        {result.content.map((property) => (
                            <ListingCard property={property} key={property.id} />
                        ))}
                    </div>
                )}

                {result.totalPages > 1 && (
                    <div className="listings-pagination">
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

                <p className="xs dim listings-footer-count">
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
                        {/* 숨김 매물은 관리자 목록에만 섞여 나온다. 어느 것이 내려 둔 매물인지 바로 보이게 표시한다. */}
                        {property.visible === false && <span className="status red">숨김</span>}
                    </div>
                    {property.priceEvaluation && (
                        <span className={`status ${PRICE_EVALUATION_BADGE[property.priceEvaluation]}`}>
                            {PRICE_EVALUATION_LABEL[property.priceEvaluation]}
                        </span>
                    )}
                </div>

                <h3 className="listings-card-title">{property.name}</h3>
                <div className="num listings-price">{property.priceLabel}</div>
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