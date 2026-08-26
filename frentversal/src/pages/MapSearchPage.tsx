import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import customAxios from '../api/axiosInstance';
import { getMyAgency } from '../api/myAgencyApi';
import { searchProperties } from '../api/propertySearchApi';
import PropertyMap from './components/PropertyMap';
import type {
    PropertySearchItem,
    PropertySearchParams,
    PropertySort,
    PropertyVisibility,
} from '../types/PropertySearch';
import {
    AREA_OPTIONS,
    DEAL_TYPES,
    PRICE_PRESETS,
    PROPERTY_TYPES,
    PROPERTY_VISIBILITIES,
    ROOM_COUNTS,
    SORT_OPTIONS,
} from '../types/PropertySearch';
import type { TagResponse } from '../types/Tag';
import type { User } from '../types/User';
import { SEOUL_DISTRICTS, dongOptionsOf } from '../utils/seoulDistricts';
import '../styles/MapSearchPage.css';

// 지도 검색 (기획서 "지도 검색 페이지")
//
// 3단 레이아웃이다.
//   왼쪽   : 필터 (매물 유형 / 거래 유형 / 지역 / 가격 / 방·면적 / 특수 조건)
//   가운데 : 카카오 지도 (가격이 적힌 마커)
//   오른쪽 : 정렬 + 매물 카드 목록 (한 페이지 4개)
//
// 중개인은 "내가 등록한 매물" 버튼과 전체/내 매물 탭이 더 보이고,
// 지도에서도 본인 매물 마커가 다른 색으로 구분된다.

interface Props {
    user: User | null;
}

// 지역(구·동) 목록은 utils/seoulDistricts 에 모아 두고 여기서는 가져다 쓰기만 한다.
// 매물이 있는 지역만 넣어 두면 "아직 매물이 없는 동네"를 아예 검색해 볼 수 없기 때문에,
// 서울시 25개 구와 그 안의 법정동을 모두 고를 수 있게 한다.

// 특수 조건으로 쓸 태그 이름. 서버 태그 중 이 이름과 맞는 것만 버튼으로 보여 준다.
// (기획서 예시: 역 도보 5분, 신축, 주차 가능, 반려동물, 즉시 입주, 공원 근처, 학원가)
const SPECIAL_TAG_CATEGORIES = ['TRANSPORTATION', 'LIVING_ENVIRONMENT', 'NATURAL_ENVIRONMENT'];

// 한 페이지에 보여 줄 매물 카드 수 (기획서: 4개)
const PAGE_SIZE = 4;

// 관리자 가격평가 상태별 화면 라벨과 표시 메타데이터를 정의함
const PRICE_EVALUATION_META = {
    UNDERVALUED: { label: '저평가', className: 'green' },
    FAIR: { label: '적정', className: 'gray' },
    OVERVALUED: { label: '고평가', className: 'orange' },
} as const;


function MapSearchPage({ user }: Props) {
    // 헤더 검색창·메인 검색창에서 ?keyword=... 로 들어온다.
    // 지역명일 수도 있고 매물 이름일 수도 있어서, 구(region) 필터에 억지로 넣지 않고
    // 서버가 이름·주소·구·동을 함께 훑는 자유 검색어로 따로 넘긴다.
    const [searchParams] = useSearchParams();

    // 헤더 검색창·메인 검색창에서 ?keyword=... 로 들어온 자유 검색어.
    // 지역명일 수도, 매물 이름일 수도 있어서 구(region) 필터에 넣지 않고
    // 서버가 이름·주소·구·동을 함께 훑는 별도 조건(keyword)으로 넘긴다.
    const initialKeyword = searchParams.get('keyword') ?? '';

    // AI 동네 분석 화면에서 "이 동네 매물 보기"로 들어올 때 ?adminCode=...&adminName=... 로 온다.
    // 행정동은 왼쪽 필터에 없는 조건이라(법정동 기준 화면이므로) 주소로만 들어오고,
    // 걸려 있는 동안에는 위쪽에 이름표를 띄워 사용자가 알 수 있게 한다.
    const initialAdminCode = searchParams.get('adminCode') ?? '';
    const initialAdminName = searchParams.get('adminName') ?? '';

    const memberRegion = user?.sigungu ?? '';

    // 처음 열 때 지역 필터를 회원이 사는 구로 미리 맞춰 둘지 정한다.
    //   1) 검색어로 들어온 경우 : 그 검색이 가장 분명한 의도이므로 지역을 강제하지 않는다
    //   2) 로그인한 회원        : 가입할 때 적은 주소의 구를 기본으로
    //   3) 그 외                : 전체
    // "전체 지역 보기"로 언제든 벗어날 수 있게 한다.
    // 집을 구할 때는 지금 사는 곳이 아니라 이사 갈 지역을 보는 경우도 많기 때문이다.
    const [usingMemberRegion, setUsingMemberRegion] = useState(!initialKeyword && Boolean(memberRegion));
    const initialRegion = usingMemberRegion ? memberRegion : '';

    // 검색창에 지금 들어 있는 검색어. 지역 필터와 별개로 즉시 반영된다.
    const [keyword, setKeyword] = useState(initialKeyword);

    // 걸려 있는 행정동 조건. 코드로 조회하고 이름은 화면에 보여 주기만 한다.
    const [adminCode, setAdminCode] = useState(initialAdminCode);
    const [adminName, setAdminName] = useState(initialAdminName);

    //  필터 입력값 ("조건 적용"을 누르기 전 상태) 
    const [type, setType] = useState('ALL');
    const [dealType, setDealType] = useState('ALL');
    const [region, setRegion] = useState(initialRegion);
    const [dong, setDong] = useState('');
    const [minPrice, setMinPrice] = useState('');
    const [maxPrice, setMaxPrice] = useState('');
    const [roomCounts, setRoomCounts] = useState<number[]>([]); // 비어 있으면 "전체"
    const [minArea, setMinArea] = useState('');
    const [maxArea, setMaxArea] = useState('');
    const [tagIds, setTagIds] = useState<number[]>([]);

    // 실제로 조회에 쓰인 조건. "조건 적용"을 눌러야 여기로 옮겨진다.
    // (검색어는 필터와 별개라 "조건 적용" 없이도 바로 반영된다)
    const [applied, setApplied] = useState<PropertySearchParams>({
        keyword: initialKeyword,
        region: initialRegion || undefined,
        adminCode: initialAdminCode || undefined,
    });

    const [sort, setSort] = useState<PropertySort>('LATEST');
    const [page, setPage] = useState(0);

    // "선택 조건 적용"을 누를 때마다 1씩 올린다.
    // 지도는 이 값이 바뀌면 고른 구가 화면에 들어오도록 시야를 다시 맞춘다.
    // 값 자체에는 의미가 없고 "다시 맞춰라"는 신호로만 쓴다 — 같은 구를 그대로 두고
    // 지도만 옮겨 둔 뒤 다시 적용해도 그 구로 돌아오게 하기 위함이다.
    const [mapFocusNonce, setMapFocusNonce] = useState(0);

    // 중개인 전용 : 전체 / 내 매물
    const [mine, setMine] = useState(false);
    const [myAgencyId, setMyAgencyId] = useState<number | null>(null);

    /*
      관리자 전용 : 공개 여부.

      관리자가 내려 둔 숨김 매물을 지도에서도 찾을 수 있어야 해서, 관리자는 숨김 매물까지
      함께 보는 '전체'로 시작한다. 관리자가 아니면 이 값을 바꿀 수단이 화면에 없고,
      보내더라도 서버(PropertyService.search)가 공개 매물만 내려 준다.
    */
    const [visibility, setVisibility] = useState<PropertyVisibility>('ALL');

    const [properties, setProperties] = useState<PropertySearchItem[]>([]);
    const [tags, setTags] = useState<TagResponse[]>([]);

    // 지도에서 마커를 누르면 그 매물만 목록에 남긴다 (기획서: "핀을 클릭하면 해당 매물만 보여진다")
    const [pinnedId, setPinnedId] = useState<number | null>(null);

    // 목록 카드에 마우스를 올렸을 때 지도에서 같은 매물을 강조한다.
    // pinnedId 와 나누어 둔 이유는, 이건 목록을 한 건으로 줄이지 않아야 하기 때문이다.
    const [hoveredId, setHoveredId] = useState<number | null>(null);

    // 지도를 축소한 상태에서 묶음 표식을 누르면 그 지역 이름이 담긴다.
    // 목록을 그 지역 매물만으로 좁히는 데 쓴다.
    const [pinnedArea, setPinnedArea] = useState<string | null>(null);

    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');

    const isBroker = user?.role === 'BROKER';
    const isAdmin = user?.role === 'ADMIN';

    // 특수 조건 버튼에 쓸 태그 목록
    useEffect(() => {
        customAxios.get<TagResponse[]>('/tag')
            .then((response) => setTags(response.data.filter(
                (tag) => SPECIAL_TAG_CATEGORIES.includes(tag.category),
            )))
            .catch(() => setTags([]));
    }, []);

    // 중개인이면 자기 사무소 번호를 미리 받아 둔다 (지도에서 내 매물 마커를 구분할 때 쓴다)
    useEffect(() => {
        if (!isBroker) {
            setMyAgencyId(null);
            return;
        }

        getMyAgency()
            .then((agency) => setMyAgencyId(agency.id))
            .catch(() => setMyAgencyId(null)); // 사무소가 아직 없는 중개인
    }, [isBroker]);

    // 조회. 적용된 조건·정렬·탭이 바뀔 때마다 다시 부른다.
    const load = useCallback(async () => {
        setLoading(true);

        try {
            // 공개 여부는 관리자만 고를 수 있다. 관리자가 아니면 아예 보내지 않고 서버 기본값에 맡긴다.
            const data = await searchProperties({
                ...applied,
                sort,
                mine,
                visibility: isAdmin ? visibility : undefined,
            });

            setProperties(data.content);
            setPinnedId(null); // 조건이 바뀌면 지도에서 고른 매물은 풀어 준다
            setPage(0);
            setMessage('');
        } catch (error: any) {
            setMessage(error.response?.data?.message ?? '매물을 불러오지 못했습니다.');
            setProperties([]);
        } finally {
            setLoading(false);
        }
    }, [applied, sort, mine, visibility, isAdmin]);

    useEffect(() => {
        load();
    }, [load]);

    // 이미 지도 검색 화면에 있는 상태에서 헤더 검색창으로 다시 검색하면
    // 컴포넌트가 새로 만들어지지 않고 주소만 바뀐다. 그래서 주소의 검색어를 따로 따라가야 한다.
    useEffect(() => {
        setKeyword(initialKeyword);
        setApplied((prev) => ({ ...prev, keyword: initialKeyword }));
        setPage(0);
        setPinnedId(null);
        setPinnedArea(null);
    }, [initialKeyword]);

    // 행정동 조건도 주소로 들어오므로 같은 이유로 따라간다.
    // 다른 동네의 "이 동네 매물 보기"를 이어서 눌렀을 때 앞의 조건이 남지 않도록 한다.
    useEffect(() => {
        setAdminCode(initialAdminCode);
        setAdminName(initialAdminName);
        setApplied((prev) => ({ ...prev, adminCode: initialAdminCode || undefined }));
        setPage(0);
        setPinnedId(null);
        setPinnedArea(null);
    }, [initialAdminCode, initialAdminName]);

    // "선택 조건 적용" — 입력값을 조회 조건으로 옮긴다.
    // 검색어는 필터가 아니라 위에서 따로 잡은 조건이므로 그대로 유지한다.
    // 필터 UI의 현재 선택값을 실제 조회/검색 조건에 반영하는 함수임
    const applyFilters = () => {
        setUsingMemberRegion(false);

        const nextApplied: PropertySearchParams = {
            keyword,
            region,
            dong,
            // 행정동은 왼쪽 필터에 없는 조건이라 여기서 다시 넣어 주지 않으면 사라진다.
            adminCode: adminCode || undefined,
            type,
            dealType,
            minPrice: minPrice ? Number(minPrice) : undefined,
            maxPrice: maxPrice ? Number(maxPrice) : undefined,
            minArea: minArea ? Number(minArea) : undefined,
            maxArea: maxArea ? Number(maxArea) : undefined,
            roomCounts,
            tagIds,
        };

        setApplied(nextApplied);
        setPage(0);
        setMapFocusNonce((nonce) => nonce + 1);

        // 최근검색은 추천용 보조 데이터임
        // 일반 USER일 때만 저장하고, 실패해도 실제 검색은 정상 진행함
        if (user?.role === 'USER') {
            // 현재 지도 검색 조건을 최근검색 로그 API로 비동기 전송함
            void customAxios.post('/recommendation/search-log', {
                districtName: nextApplied.region || null,
                dealType:
                    nextApplied.dealType && nextApplied.dealType !== 'ALL'
                        ? nextApplied.dealType
                        : null,
                propertyType:
                    nextApplied.type && nextApplied.type !== 'ALL'
                        ? nextApplied.type
                        : null,
                minPrice: nextApplied.minPrice ?? null,
                maxPrice: nextApplied.maxPrice ?? null,
            }).catch((error) => {
                console.error('추천용 최근 검색 기록 저장 실패', error);
            });
        }
    };

    // 지역(구·동)은 "선택 조건 적용"을 기다리지 않고 고르는 즉시 조회에 반영한다.
    //
    // 지역을 고르면 지도가 곧바로 그 지역으로 옮겨 가고 경계까지 그려진다.
    // 그런데 표식과 목록만 예전 조건에 머물러 있으면 "서초구를 보고 있는데
    // 강남구 매물이 찍혀 있는" 상태가 되어, 지금 무엇을 보고 있는지 알 수 없다.
    //
    // 가격·방 개수 같은 나머지 조건은 여러 개를 함께 고르는 것이라 그대로 "적용" 버튼을 쓴다.
    // 지역은 "어디를 볼지" 정하는 이동에 가까워서 다르게 둔다.
    const changeRegion = (nextRegion: string) => {
        setUsingMemberRegion(false);
        setRegion(nextRegion);
        setDong(''); // 구가 바뀌면 이전 구의 동은 의미가 없다
        setApplied((prev) => ({ ...prev, region: nextRegion, dong: '' }));
        setPage(0);
    };

    const changeDong = (nextDong: string) => {
        setDong(nextDong);
        setApplied((prev) => ({ ...prev, dong: nextDong }));
        setPage(0);
    };

    // "초기화" — 적용된 조건까지 모두 처음 상태로 (검색어는 유지한다)
    const resetFilters = () => {
        setUsingMemberRegion(false);
        setType('ALL');
        setDealType('ALL');
        setRegion('');
        setDong('');
        setMinPrice('');
        setMaxPrice('');
        setRoomCounts([]);
        setMinArea('');
        setMaxArea('');
        setTagIds([]);
        setAdminCode('');
        setAdminName('');
        setVisibility('ALL');
        setApplied({ keyword });
        setPage(0);
    };

    // 행정동 조건만 뗀다. 나머지 필터는 그대로 두고 서울 전체로 넓힌다.
    const clearAdminFilter = () => {
        setAdminCode('');
        setAdminName('');
        setApplied((prev) => ({ ...prev, adminCode: undefined }));
        setPage(0);
    };

    // 검색어만 지운다. 필터는 그대로 두고 전체 지역으로 넓힌다.
    const clearKeyword = () => {
        setKeyword('');
        setApplied((prev) => ({ ...prev, keyword: '' }));
        setPage(0);
    };

    // 방 개수는 복수 선택. 다시 누르면 해제되고, 모두 해제하면 "전체"가 된다.
    const toggleRoomCount = (value: number) => {
        setRoomCounts((prev) => prev.includes(value)
            ? prev.filter((item) => item !== value)
            : [...prev, value]);
    };

    const toggleTag = (id: number) => {
        setTagIds((prev) => prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]);
    };

    // 가격대 버튼을 누르면 입력칸도 함께 채워 준다
    const applyPricePreset = (preset: { minPrice?: number; maxPrice?: number }) => {
        setMinPrice(preset.minPrice ? String(preset.minPrice) : '');
        setMaxPrice(preset.maxPrice ? String(preset.maxPrice) : '');
    };

    // 지도에서 고른 것이 있으면 목록을 그만큼 좁힌다.
    //   표식 하나를 눌렀으면 그 매물만, 묶음 표식을 눌렀으면 그 지역 매물만.
    const visibleProperties = useMemo(() => {
        if (pinnedId != null) return properties.filter((item) => item.id === pinnedId);

        if (pinnedArea != null) {
            return properties.filter((item) => item.dong === pinnedArea || item.gu === pinnedArea);
        }

        return properties;
    }, [properties, pinnedId, pinnedArea]);

    // 페이징 (한 페이지 4개)
    const totalPages = Math.ceil(visibleProperties.length / PAGE_SIZE);
    const pageItems = visibleProperties.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

    const dongOptions = dongOptionsOf(region);
    const pricePresets = PRICE_PRESETS[dealType] ?? PRICE_PRESETS.ALL;

    return (
        <main>
            <section className="map-shell">
                {/*  왼쪽 : 필터  */}
                <aside className="filter-panel">
                    <div className="row between">
                        <h2 style={{ fontSize: 22 }}>필터</h2>
                        <button className="xs" style={{ color: 'var(--v)' }} onClick={resetFilters}>초기화</button>
                    </div>

                    {/* AI 동네 분석에서 넘어온 행정동 조건. 왼쪽 필터에는 없는 조건이라 여기서 알려 준다. */}
                    {adminCode && (
                        <div className="map-adminfilter">
                            <span>AI 동네 분석 · {adminName || adminCode}</span>
                            <button type="button" onClick={clearAdminFilter}>해제</button>
                        </div>
                    )}

                    {/* 매물 유형 — 하나만 고른다 */}
                    <div className="filter-block">
                        <h4>매물 유형</h4>
                        <div className="chip-group">
                            {PROPERTY_TYPES.map((item) => (
                                <button
                                    className={`filter-chip${type === item.value ? ' on' : ''}`}
                                    onClick={() => setType(item.value)}
                                    key={item.value}
                                >
                                    {item.label}
                                </button>
                            ))}
                        </div>
                        {type === 'OFFICETEL' && (
                            <p className="xs dim" style={{ marginTop: 8 }}>
                                단지별 보기는 준비 중입니다. 지금은 매물별로 보여 드립니다.
                            </p>
                        )}
                    </div>

                    {/* 거래 유형 — 하나만 고른다 */}
                    <div className="filter-block">
                        <h4>거래 유형</h4>
                        <div className="chip-group">
                            {DEAL_TYPES.map((item) => (
                                <button
                                    className={`filter-chip${dealType === item.value ? ' on' : ''}`}
                                    onClick={() => setDealType(item.value)}
                                    key={item.value}
                                >
                                    {item.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 지역 : 구를 고른 뒤 동을 더 고를 수 있다 */}
                    <div className="filter-block">
                        <h4>지역</h4>
                        <div className="fields-2">
                            <select
                                value={region}
                                onChange={(event) => changeRegion(event.target.value)}
                            >
                                <option value="">구 전체</option>
                                {SEOUL_DISTRICTS.map((district) => (
                                    <option value={district} key={district}>{district}</option>
                                ))}
                            </select>
                            <select
                                value={dong}
                                onChange={(event) => changeDong(event.target.value)}
                                disabled={dongOptions.length === 0}
                            >
                                <option value="">동 전체</option>
                                {dongOptions.map((item) => (
                                    <option value={item.value} key={item.value}>{item.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* 가격 범위 : 입력 + 자주 찾는 가격대(거래 유형마다 다름) */}
                    <div className="filter-block">
                        <h4>가격 범위 (만원)</h4>
                        <div className="fields-2">
                            <input
                                type="number"
                                placeholder="최소"
                                value={minPrice}
                                onChange={(event) => setMinPrice(event.target.value)}
                            />
                            <input
                                type="number"
                                placeholder="최대"
                                value={maxPrice}
                                onChange={(event) => setMaxPrice(event.target.value)}
                            />
                        </div>
                        <div className="chip-group" style={{ marginTop: 10 }}>
                            {pricePresets.map((preset) => (
                                <button
                                    className="filter-chip"
                                    onClick={() => applyPricePreset(preset)}
                                    key={preset.label}
                                >
                                    {preset.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 방 개수 : 복수 선택. 아무것도 안 고르면 전체 */}
                    <div className="filter-block">
                        <h4>방 개수</h4>
                        <div className="chip-group">
                            <button
                                className={`filter-chip${roomCounts.length === 0 ? ' on' : ''}`}
                                onClick={() => setRoomCounts([])}
                            >
                                전체
                            </button>
                            {ROOM_COUNTS.map((item) => (
                                <button
                                    className={`filter-chip${roomCounts.includes(item.value) ? ' on' : ''}`}
                                    onClick={() => toggleRoomCount(item.value)}
                                    key={item.value}
                                >
                                    {item.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 면적 : 최소 ~ 최대 */}
                    <div className="filter-block">
                        <h4>면적 (㎡)</h4>
                        <div className="fields-2">
                            <select value={minArea} onChange={(event) => setMinArea(event.target.value)}>
                                <option value="">최소</option>
                                {AREA_OPTIONS.map((item) => (
                                    <option value={item} key={item}>{item}㎡</option>
                                ))}
                            </select>
                            <select value={maxArea} onChange={(event) => setMaxArea(event.target.value)}>
                                <option value="">최대</option>
                                {AREA_OPTIONS.map((item) => (
                                    <option value={item} key={item}>{item}㎡</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* 특수 조건 : 태그. 고른 것을 모두 가진 매물만 남는다 */}
                    {tags.length > 0 && (
                        <div className="filter-block">
                            <h4>특수 조건</h4>
                            <div className="chip-group">
                                {tags.map((tag) => (
                                    <button
                                        className={`filter-chip${tagIds.includes(tag.id) ? ' on' : ''}`}
                                        onClick={() => toggleTag(tag.id)}
                                        key={tag.id}
                                    >
                                        {tag.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 관리자 전용 : 공개 여부.
                        숨김 매물은 관리자가 내려 둔 매물이라 사용자 화면에 나오면 안 되고,
                        서버도 관리자가 아니면 공개 매물만 내려 준다. */}
                    {isAdmin && (
                        <div className="filter-block">
                            <h4>공개 여부</h4>
                            <div className="chip-group">
                                {PROPERTY_VISIBILITIES.map((item) => (
                                    <button
                                        className={`filter-chip${visibility === item.value ? ' on' : ''}`}
                                        onClick={() => { setVisibility(item.value); setPage(0); }}
                                        key={item.value}
                                    >
                                        {item.label}
                                    </button>
                                ))}
                            </div>
                            <p className="xs dim" style={{ marginTop: 8 }}>
                                숨김 매물은 관리자에게만 보이며 지도에서 회색 표식으로 표시됩니다.
                            </p>
                        </div>
                    )}

                    {/* 중개인 전용 : 내가 등록한 매물 */}
                    {isBroker && (
                        <div className="filter-block">
                            <h4>내 매물</h4>
                            <button
                                className={`filter-chip${mine ? ' on' : ''}`}
                                onClick={() => setMine(!mine)}
                            >
                                내가 등록한 매물만 보기
                            </button>
                        </div>
                    )}

                    <button className="solid-btn" style={{ width: '100%', marginTop: 18 }} onClick={applyFilters}>
                        선택 조건 적용
                    </button>
                </aside>

                {/*  가운데 : 지도  */}
                <PropertyMap
                    properties={properties}
                    myAgencyId={myAgencyId}
                    selectedId={pinnedId ?? hoveredId}
                    onSelect={(id) => { setPinnedId(id); setPinnedArea(null); setPage(0); }}
                    onSelectGroup={(names) => { setPinnedArea(names[0]); setPinnedId(null); setPage(0); }}
                    // 회원이 가입할 때 적은 주소로 지도를 시작한다.
                    // 주소가 없으면(예전에 로그인해 둔 정보라 주소가 안 담긴 경우) 구 이름만으로도 찾는다.
                    // 검색해서 들어온 경우에는 그 의도가 우선이라 넘기지 않는다.
                    initialCenterAddress={initialKeyword ? null : (user?.address || user?.sigungu)}
                    // 지도에 처음 들어왔을 때는 회원이 사는 구가, 필터에서 구를 고르면 그 구가
                    // 테두리로 강조된다. "선택 조건 적용"을 누르기 전에도 바로 반영된다.
                    highlightRegion={region || null}
                    // 동까지 고르면 그 동네로 확대해서 옮긴다. 구 경계선은 그대로 남는다.
                    highlightDong={dong || null}
                    focusNonce={mapFocusNonce}
                />

                {/*  오른쪽 : 매물 목록  */}
                <aside className="list-panel">
                    <div className="row between">
                        <div>
                            <div className="eyebrow">Map Search</div>
                            <h2 style={{ fontSize: 23 }}>매물 리스트</h2>
                        </div>
                        <span className="status purple"><b>{visibleProperties.length}</b>건</span>
                    </div>

                    {/* 검색어로 들어왔을 때 지금 무엇으로 찾고 있는지 보여 준다.
                        지역명이든 매물 이름이든 같은 검색어 한 개로 찾으므로 문구도 하나로 둔다. */}
                    {applied.keyword && (
                        <div className="map-keyword">
                            <span className="term">‘{applied.keyword}’ 검색 결과</span>
                            <button type="button" onClick={clearKeyword}>검색어 지우기</button>
                        </div>
                    )}

                    {/* 중개인 : 전체 / 내 매물 탭 */}
                    {isBroker && (
                        <div className="tabs" style={{ marginTop: 14 }}>
                            <button className={`tab-btn${mine ? '' : ' on'}`} onClick={() => setMine(false)}>전체</button>
                            <button className={`tab-btn${mine ? ' on' : ''}`} onClick={() => setMine(true)}>내 매물</button>
                        </div>
                    )}

                    {/* 회원 지역이 기본으로 걸렸을 때, 왜 이 지역인지 알려 주고 벗어날 길을 준다 */}
                    {usingMemberRegion && (
                        <div className="row between" style={{ marginTop: 12 }}>
                            <span className="xs dim">
                                회원님 지역(<b>{memberRegion}</b>) 매물을 먼저 보고 있습니다.
                            </span>
                            <button
                                className="xs"
                                style={{ color: 'var(--v)' }}
                                onClick={() => {
                                    setUsingMemberRegion(false);
                                    setRegion('');
                                    setDong('');
                                    setApplied((prev) => ({ ...prev, region: '', dong: '' }));
                                }}
                            >
                                전체 지역 보기
                            </button>
                        </div>
                    )}

                    {/* 지도에서 무언가를 골랐을 때만 보이는 안내 */}
                    {(pinnedId != null || pinnedArea != null) && (
                        <div className="row between" style={{ marginTop: 12 }}>
                            <span className="xs dim">
                                {pinnedArea != null
                                    ? `${pinnedArea} 매물만 보고 있습니다.`
                                    : '지도에서 고른 매물만 보고 있습니다.'}
                            </span>
                            <button
                                className="xs"
                                style={{ color: 'var(--v)' }}
                                onClick={() => { setPinnedId(null); setPinnedArea(null); }}
                            >
                                전체 보기
                            </button>
                        </div>
                    )}

                    <div className="toolbar" style={{ marginTop: 15 }}>
                        <select
                            className="search-box"
                            value={sort}
                            onChange={(event) => setSort(event.target.value as PropertySort)}
                        >
                            {SORT_OPTIONS.map((item) => (
                                <option value={item.value} key={item.value}>{item.label}</option>
                            ))}
                        </select>
                    </div>

                    {message && <p className="xs" style={{ marginTop: 12, color: 'var(--red)' }}>{message}</p>}
                    {loading && <p className="xs dim" style={{ marginTop: 12 }}>불러오는 중입니다…</p>}

                    {!loading && visibleProperties.length === 0 && (
                        <p className="xs dim" style={{ marginTop: 12 }}>
                            조건에 맞는 매물이 없습니다. 필터를 넓혀 보세요.
                        </p>
                    )}

                    <div className="property-list">
                        {pageItems.map((property) => (
                            <Link
                                className="property-row"
                                to={`/property/${property.id}`}
                                key={property.id}
                                // 카드에 마우스를 올리면 지도에서도 같은 매물이 강조된다
                                onMouseEnter={() => setHoveredId(property.id)}
                                onMouseLeave={() => setHoveredId(null)}
                            >
                                <div
                                    className="thumb"
                                    style={property.thumbnailUrl
                                        ? { backgroundImage: `url('${property.thumbnailUrl}')` }
                                        : undefined}
                                />
                                <div>
                                    <div className="row between">
                                        {/* 시세 평가 */}
                                        {/* 관리자 수동 priceEvaluation 값이 있으면 해당 상태 배지를 표시함 */}
                                        {property.priceEvaluation ? (
                                            <span className={`status ${PRICE_EVALUATION_META[property.priceEvaluation].className}`}>
                                                {PRICE_EVALUATION_META[property.priceEvaluation].label}
                                            </span>
                                        ) : (
                                            <span className="status gray">시세 평가 없음</span>
                                        )}

                                        <span className="row gap8">
                                            {/* 숨김 매물은 관리자 목록에만 섞여 나온다.
                                                어느 것이 내려 둔 매물인지 바로 보이게 표시한다. */}
                                            {property.visible === false && (
                                                <span className="status red">숨김</span>
                                            )}

                                            {myAgencyId != null && property.agencyId === myAgencyId && (
                                                <span className="status purple">내 매물</span>
                                            )}
                                        </span>
                                    </div>

                                    <h3>{property.priceLabel}</h3>
                                    <p>
                                        {/* 동을 못 뽑은 주소는 구를, 그것도 없으면 주소를 그대로 보여 준다 */}
                                        {property.dong ?? property.gu ?? property.address}
                                        {property.areaLabel ? ` · ${property.areaLabel}` : ''}
                                        {property.floor != null ? ` · ${property.floor}층` : ''}
                                    </p>

                                    {/* 핵심 키워드 */}
                                    {property.keywords.length > 0 && (
                                        <div className="row gap8" style={{ marginTop: 9 }}>
                                            {property.keywords.map((keyword) => (
                                                <span className="tag" key={keyword}>{keyword}</span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </Link>
                        ))}
                    </div>

                    {/* 페이징 (한 페이지 4개) */}
                    {totalPages > 1 && (
                        <div className="row" style={{ gap: 6, marginTop: 16, justifyContent: 'center' }}>
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
                </aside>
            </section>
        </main>
    );
}

export default MapSearchPage;
