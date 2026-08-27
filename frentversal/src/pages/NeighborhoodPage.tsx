import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { getNeighborhoodExplore } from '../api/neighborhoodApi';
import type {
    NeighborhoodExploreItem,
    NeighborhoodExploreResponse,
    NeighborhoodExploreSearchParams,
} from '../types/NeighborhoodExplore';
import type { User } from '../types/User';
import NeighborhoodMap from './components/NeighborhoodMap';
import '../styles/NeighborhoodPage.css';

interface NeighborhoodPageProps {
    user: User | null;
}

const EMPTY_RESPONSE: NeighborhoodExploreResponse = {
    content: [],
    clusterNames: [],
    districts: [],
    tagGroups: {},
};

const PAGE_SIZE = 6;

// 페이지 번호를 한 줄에 몇 개씩 끊어 보여 줄지.
// 행정동이 425개라 전체 페이지가 71쪽이고, 번호를 다 늘어놓으면 화면을 넘어간다.
// 10개씩 끊고 << >> 로 묶음을 옮긴다.
const PAGE_BLOCK_SIZE = 10;

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
    const [result, setResult] = useState<NeighborhoodExploreResponse>(EMPTY_RESPONSE);
    const [search, setSearch] = useState<NeighborhoodExploreSearchParams>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [page, setPage] = useState(1);

    useEffect(() => {
        let active = true;
        const loadNeighborhoods = async () => {
            setLoading(true);
            setError('');
            try {
                const data = await getNeighborhoodExplore(search);
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

    const pageCount = Math.max(1, Math.ceil(result.content.length / PAGE_SIZE));
    const pagedNeighborhoods = result.content.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    // 지금 페이지가 속한 10개 묶음의 첫 쪽과 끝 쪽. 번호 버튼은 이 범위만 그린다.
    const blockStart = Math.floor((page - 1) / PAGE_BLOCK_SIZE) * PAGE_BLOCK_SIZE + 1;
    const blockEnd = Math.min(blockStart + PAGE_BLOCK_SIZE - 1, pageCount);
    const blockPages = Array.from(
        { length: blockEnd - blockStart + 1 },
        (_, index) => blockStart + index,
    );

    // << >> 는 앞뒤 묶음의 첫 쪽으로 보낸다. 마지막 묶음이 10쪽보다 짧아도 범위를 넘지 않게 막는다.
    const goPrevBlock = () => setPage(Math.max(1, blockStart - PAGE_BLOCK_SIZE));
    const goNextBlock = () => setPage(Math.min(pageCount, blockStart + PAGE_BLOCK_SIZE));

    /*
      유형을 바꾸면 그 유형에 없는 태그 선택은 함께 푼다.

      칩이 유형별로 갈려 있어서, 그대로 두면 칩은 숨었는데 조건만 남는다.
      결과가 0곳으로 줄어도 화면에서는 이유를 알 수 없다.
    */
    const selectCluster = (clusterName: string | undefined) => {
        setSearch((previous) => {
            const current = previous.tagNames ?? [];
            const allowed = clusterName ? result.tagGroups[clusterName] ?? [] : null;
            const next = allowed === null ? current : current.filter((name) => allowed.includes(name));

            return { ...previous, clusterName, tagNames: next.length > 0 ? next : undefined };
        });
    };

    const selectDistrict = (district: string) => {
        setSearch((previous) => ({ ...previous, district: district || undefined }));
    };

    /*
      유형 탭 아래에 그릴 태그 칩.

      유형을 고르면 그 유형의 태그만, 전체일 때는 모든 유형의 태그를 순서대로 펼쳐 보여 준다.
      유형별 소제목을 따로 달지 않고 탭 선택으로 갈라 놓는 이유는, 소제목이 세 줄로 늘어지면
      필터 영역이 화면을 너무 많이 차지하기 때문이다.
    */
    const tagOptions = useMemo(() => {
        const groups = search.clusterName
            ? [result.tagGroups[search.clusterName] ?? []]
            : Object.values(result.tagGroups);

        return [...new Set(groups.flat())];
    }, [result.tagGroups, search.clusterName]);

    const selectedTagNames = search.tagNames ?? [];

    const toggleTag = (tagName: string) => {
        setSearch((previous) => {
            const current = previous.tagNames ?? [];
            const next = current.includes(tagName)
                ? current.filter((name) => name !== tagName)
                : [...current, tagName];
            return { ...previous, tagNames: next.length > 0 ? next : undefined };
        });
    };

    return (
        <main className="neighborhood-page">
            <section className="page-hero neighborhood-hero"><div className="wrap">
                <div>
                    <div className="eyebrow">Neighborhood explorer</div>
                    <h1>동네 탐색</h1>
                    <p>서울 전체 동네를 생활환경 유형별로 둘러보세요. 유형은 K-Means 군집 분석 결과입니다.</p>
                </div>
                <div className="hero-stat">
                    <span className="mono dim">검색 결과</span>
                    <strong>{result.content.length}곳</strong>
                    <span className="xs dim">행정동 기준</span>
                </div>
            </div></section>

            <section className="section"><div className="wrap neighborhood-wrap">
                <section className="neighborhood-filter-card">
                    <div className="neighborhood-location-fields">
                        <label>시·도<input type="text" value={FIXED_CITY} disabled /></label>
                        <label>자치구<select value={search.district ?? ''} onChange={(event) => selectDistrict(event.target.value)}>
                            <option value="">전체</option>
                            {result.districts.map((district) => <option key={district} value={district}>{district}</option>)}
                        </select></label>
                    </div>

                    {/*
                      생활 태그 필터.

                      위 탭은 K-Means 동네 유형이고, 아래 칩은 그 유형에 배분된 태그다.
                      유형을 고르면 목록이 그 유형으로 좁혀지는 동시에 칩도 그 유형의 것만 남는다.
                      전체일 때는 모든 유형의 태그를 펼쳐 보여 준다.

                      칩은 확정 태그와 한줄평 분석이 제안한 태그를 함께 본다. 확정 태그는 등록된 동네
                      7곳에만 있어서 그것만 쓰면 필터가 거의 동작하지 않기 때문이다.
                      여러 개를 고르면 하나라도 맞는 동네를 보여주고 많이 맞는 순으로 세운다.
                    */}
                    <div className="neighborhood-tag-area">
                        <span className="neighborhood-filter-label">생활 태그</span>

                        <div className="tabs neighborhood-tabs">
                            <button
                                className={`tab-btn${!search.clusterName ? ' on' : ''}`}
                                type="button"
                                onClick={() => selectCluster(undefined)}
                            >
                                전체
                            </button>
                            {result.clusterNames.map((clusterName) => (
                                <button
                                    className={`tab-btn${search.clusterName === clusterName ? ' on' : ''}`}
                                    type="button"
                                    onClick={() => selectCluster(clusterName)}
                                    key={clusterName}
                                >
                                    {clusterName}
                                </button>
                            ))}
                        </div>

                        <div className="neighborhood-tag-buttons">
                            {tagOptions.map((tagName) => (
                                <button
                                    className={`filter-chip${selectedTagNames.includes(tagName) ? ' on' : ''}`}
                                    type="button"
                                    onClick={() => toggleTag(tagName)}
                                    key={tagName}
                                >
                                    {tagName}
                                </button>
                            ))}
                        </div>

                        {selectedTagNames.length > 0 && (
                            <div className="neighborhood-selected-tags">
                                <span>선택한 태그</span>
                                {selectedTagNames.map((tagName) => (
                                    <button type="button" onClick={() => toggleTag(tagName)} key={tagName}>
                                        {tagName} ×
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </section>

                {loading && <div className="neighborhood-state">동네 정보를 불러오는 중입니다.</div>}
                {!loading && error && <div className="neighborhood-state error">{error}</div>}
                {!loading && !error && result.content.length === 0 && <div className="neighborhood-state">선택한 조건에 맞는 동네가 없습니다.</div>}
                {!loading && !error && <div className="neighborhood-grid">
                    {pagedNeighborhoods.map((neighborhood: NeighborhoodExploreItem) => (
                        <article className="neighborhood-card" key={neighborhood.adminCode}>
                            <Link to={`/neighborhood/ml/${encodeURIComponent(neighborhood.adminCode)}`}>
                                <div className="neighborhood-visual">
                                    <NeighborhoodMap
                                        city={FIXED_CITY}
                                        district={neighborhood.districtName}
                                        dong={neighborhood.adminName}
                                    />
                                </div>
                                <div className="neighborhood-card-body">
                                    <div className="row between">
                                        <div>
                                            <span className="xs dim">{neighborhood.districtName}, {neighborhood.clusterName}</span>
                                            <h2>{neighborhood.adminName}</h2>
                                        </div>
                                        {/* 여러 태그를 골랐을 때만 표시한다. 하나만 골랐으면 전부 1개라 알려 줄 것이 없다. */}
                                        {selectedTagNames.length > 1 && neighborhood.matchedTagCount > 0 && (
                                            <span className="neighborhood-match">
                                                태그 {neighborhood.matchedTagCount}개 일치
                                            </span>
                                        )}
                                    </div>
                                    <p>{neighborhood.description || '등록된 동네 소개가 없습니다.'}</p>

                                    {/*
                                      확정 태그 -> AI 추천 태그 -> 한줄평 키워드 순으로 있는 것 하나만 그린다.
                                      등록된 동네가 425개 중 7개뿐이라 대부분의 카드는 뒤쪽 두 가지로 채워진다.
                                      확정된 태그가 아니라는 것이 드러나야 해서 라벨을 달고 모양도 다르게 둔다.
                                    */}
                                    {neighborhood.tags.length > 0 ? (
                                        <div className="neighborhood-card-tags">
                                            {neighborhood.tags.slice(0, 3).map((tag) => <span key={tag.id}>#{tag.name}</span>)}
                                        </div>
                                    ) : neighborhood.suggestedTags.length > 0 ? (
                                        <div className="neighborhood-card-keywords">
                                            <span className="neighborhood-keyword-label">AI 추천 태그</span>
                                            {neighborhood.suggestedTags.slice(0, 3).map((tag) => (
                                                <span className="neighborhood-keyword" key={tag.id}>{tag.name}</span>
                                            ))}
                                        </div>
                                    ) : neighborhood.keywords.length > 0 && (
                                        <div className="neighborhood-card-keywords">
                                            <span className="neighborhood-keyword-label">한줄평 키워드</span>
                                            {neighborhood.keywords.slice(0, 4).map((keyword) => (
                                                <span className="neighborhood-keyword" key={keyword}>{keyword}</span>
                                            ))}
                                        </div>
                                    )}
                                    <dl className="neighborhood-stats">
                                        <div><dt>평균 전세</dt><dd>{formatJeonsePrice(neighborhood.averageJeonsePrice)}</dd></div>
                                        <div><dt>매물</dt><dd>{neighborhood.propertyCount}건</dd></div>
                                    </dl>
                                </div>
                            </Link>
                        </article>
                    ))}
                </div>}
                {!loading && !error && pageCount > 1 && <nav className="neighborhood-pagination" aria-label="동네 목록 페이지">
                    <button type="button" aria-label="이전 10페이지" title="이전 10페이지" disabled={blockStart === 1} onClick={goPrevBlock}>&laquo;</button>
                    <button type="button" disabled={page === 1} onClick={() => setPage((current) => current - 1)}>이전</button>
                    {blockPages.map((pageNumber) => (
                        <button className={page === pageNumber ? 'active' : ''} type="button" onClick={() => setPage(pageNumber)} key={pageNumber}>{pageNumber}</button>
                    ))}
                    <button type="button" disabled={page === pageCount} onClick={() => setPage((current) => current + 1)}>다음</button>
                    <button type="button" aria-label="다음 10페이지" title="다음 10페이지" disabled={blockEnd === pageCount} onClick={goNextBlock}>&raquo;</button>
                </nav>}

                {user?.role === 'ADMIN' && (
                    <p className="xs dim" style={{ marginTop: 24 }}>
                        동네 설명, 사진, 태그 등록/수정은 <Link to="/admin/neighborhoods">관리자 콘솔의 동네 관리</Link>에서 할 수 있습니다.
                    </p>
                )}
            </div></section>
        </main>
    );
}

export default NeighborhoodPage;
