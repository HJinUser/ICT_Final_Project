import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { getHomeData } from "../api/homeApi";
import { getNotices } from "../api/noticeApi";
import HomeAdminDetail from "./components/HomeAdminDetail";
import HomeAdminSummary from "./components/HomeAdminSummary";
import HomeBrokerDetail from "./components/HomeBrokerDetail";
import HomeBrokerSummary from "./components/HomeBrokerSummary";
import HomeRecommend from "./components/HomeRecommend";
import HomeSectionNav, { type SectionNavItem } from "./components/HomeSectionNav";
import { buildCompareRows } from "../types/HomeCompareMapper";
import type { HomeData, HomeCompareData, PriceEvaluation } from "../types/Home";
import type { PropertyResponse, DealTypeCode } from "../types/Property";
import { DEAL_TYPE_LABELS } from "../utils/propertyPrice";
import type { Notice } from "../types/Notice";
import type { User } from "../types/User";
import type { NavItem } from "../types/Navigation";
import { navigateOrNotice } from "../utils/navigateOrNotice";
import NeighborhoodMap from './components/NeighborhoodMap';
import WORDCLOUD_IMAGE from '../assets/neighborhoodWordcloud.png';
import "../styles/HomePage.css";



// 히어로/CTA 배경처럼 화면 장식으로만 쓰는 사진.
// 매물·동네 사진과 달리 서버에서 받아올 값이 아니라서 여기에 상수로 둔다.
const HERO_IMAGE = 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=70';
const CTA_IMAGE = 'https://images.unsplash.com/photo-1449844908441-8829872d2607?auto=format&fit=crop&w=1600&q=70';

/*
  한줄평 워드클라우드.

  prentversal/training/make_neighborhood_wordcloud.py가 만든 PNG를 그대로 가져다 쓴다.
  서버가 그때그때 그려 주는 것이 아니라 손으로 갱신하는 이미지라서, 텍스트마이닝을
  다시 돌렸다면 아래 세 가지를 같이 고쳐야 화면과 그림이 어긋나지 않는다.

    1. outputs/neighborhood_wordcloud.png 를 src/assets/neighborhoodWordcloud.png 로 덮어쓰기
    2. WORDCLOUD_SOURCE_COUNT 를 스크립트가 찍어 준 "원본 한줄평 N건" 으로 수정
    3. WORDCLOUD_TOP_WORDS 를 스크립트가 찍어 준 상위 단어로 수정 (그림을 못 보는 사용자를 위한 대체 텍스트다)
*/
const WORDCLOUD_SOURCE_COUNT = 53;
const WORDCLOUD_TOP_WORDS = ['시설', '교통', '편의', '맛집', '생활'];

const SHORTCUTS: (NavItem & { desc: string; image: string })[] = [
    {
        label: '지도 검색', path: '/map', ready: true,
        desc: '가격대별로 색이 다른 마커로 시세 분포를 한눈에',
        image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=70',
    },
    {
        label: '동네 탐색', path: '/neighborhood', ready: true,
        desc: '조용한 곳, 역 가까운 곳, 새 건물 많은 곳',
        image: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=800&q=70',
    },
    {
        label: '맞춤 추천', path: '/recommend', ready: true,
        desc: '몇 개만 별점 매기면 그 기준으로 골라 드려요',
        image: 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=800&q=70',
    },
    {
        label: '매물 확인', path: '/listings', ready: false,
        desc: '지도 없이 새로 나온 순서대로 전체 매물을 훑어보기',
        image: 'https://images.unsplash.com/photo-1554995207-c18c203602cb?auto=format&fit=crop&w=800&q=70',
    },
];

// 히어로 검색창 아래 추천 키워드
const QUICK_KEYWORDS = ['서초구 전세', '강남구 전세', '3억 이하', '역 도보 5분', '신축 5년 이내'];

// 메인에 보여 줄 공지 개수. 상단 메뉴에서 내려온 자리라 목록 전체가 아니라 최근 것만 걸어 둔다.
const HOME_NOTICE_COUNT = 5;

// 비교표의 "주변 환경" 칸에 보여 줄 태그 개수. 화면정의서에 최대 5개로 정해져 있다.
const COMPARE_TAG_LIMIT = 5;

// 비교 탭(대문자 DealTypeCode) → 실제 응답 필드명(소문자) 매핑
const COMPARE_TAB_KEYS: Record<DealTypeCode, keyof HomeCompareData> = {
    SALE: 'sale',
    JEONSE: 'jeonse',
    MONTHLY: 'monthly',
};

const COMPARE_TABS: DealTypeCode[] = ['SALE', 'JEONSE', 'MONTHLY'];

// 시세 평가 값을 배지 색 클래스/문구로 바꾼다. 다른 화면(ListingsPage 등)과 같은 저평가/적정/고평가 표현이다.
const PRICE_EVALUATION_CLASS: Record<PriceEvaluation, string> = {
    UNDERVALUED: 'low',
    FAIR: 'mid',
    OVERVALUED: 'high',
};

const PRICE_EVALUATION_LABEL: Record<PriceEvaluation, string> = {
    UNDERVALUED: '저평가',
    FAIR: '적정',
    OVERVALUED: '고평가',
};

const MAP_ITEM: NavItem = { label: '지도 검색', path: '/map', ready: true };
const NEIGHBORHOOD_ITEM: NavItem = { label: '동네 탐색', path: '/neighborhood', ready: true };

// 섹션 목차(스크롤스파이) 대상. 역할과 상관없이 모두에게 보이는 공통 구역만 담는다.
// 중개인·관리자 전용 블록(요약·상세)은 각자 "전체 보기"·"콘솔 열기" 링크가 있어 목차에 넣지 않는다.
const SECTION_NAV_ITEMS: SectionNavItem[] = [
    { id: 's-notice', label: '공지사항' },
    { id: 's-shortcuts', label: '어디서 찾을까' },
    { id: 's-recommend', label: '맞춤 추천' },
    { id: 's-weekly', label: '이번 주 매물' },
    { id: 's-compare', label: '매물 비교' },
    { id: 's-neighborhood', label: '동네 둘러보기' },
    { id: 's-voices', label: '동네 이야기' },
    { id: 's-hows', label: '이용 방법' },
];


const TONE_CYCLE = ['tone-gray', 'tone-white'] as const;

function toneOf(sectionId: string): string {
    const index = SECTION_NAV_ITEMS.findIndex((item) => item.id === sectionId);

    // 목차에 없는 구역(역할별 블록 등)은 교대 대상이 아니라서 흰색으로 둔다
    if (index < 0) {
        return 'tone-white';
    }

    return TONE_CYCLE[index % TONE_CYCLE.length];
}

// 맨 아래 CTA 문구와 버튼. 역할마다 다음에 할 일이 다르므로 여기서 한 번에 관리한다.
type CtaAction = { label: string; path: string };
type Cta = { title: string; desc: string; primary: CtaAction; secondary: CtaAction };

const GUEST_CTA: Cta = {
    title: '다음 집은 제값에 구하세요',
    desc: '회원가입하고 마음에 드는 집 몇 개만 골라 두면, 그다음부터는 알아서 찾아 드립니다.',
    primary: { label: '회원가입', path: '/member/signup' },
    secondary: { label: '먼저 둘러보기', path: '/map' },
};

const ROLE_CTA: Record<User['role'], Cta> = {
    USER: {
        title: '마음에 든 집은 모아 두세요',
        desc: '관심 매물로 담아 두면 두 집을 표로 나란히 놓고 비교할 수 있습니다.',
        primary: { label: '관심 목록 보기', path: '/favorites' },
        secondary: { label: '매물 더 찾기', path: '/map' },
    },
    BROKER: {
        title: '새 매물을 올려 보세요',
        desc: '등록 과정에서 AI 예상 시세를 함께 확인할 수 있어, 호가를 정할 때 참고가 됩니다.',
        primary: { label: '매물 등록하기', path: '/property/form' },
        secondary: { label: '내 매물 관리', path: '/broker/properties' },
    },
    ADMIN: {
        title: '처리할 항목은 콘솔에 모여 있습니다',
        desc: '매물 승인, 중개인 심사, 신고 처리를 한 화면에서 이어서 할 수 있습니다.',
        primary: { label: '관리자 콘솔 열기', path: '/admin' },
        secondary: { label: '공지 작성', path: '/notice/new' },
    },
};

interface Props {
    user: User | null;
}

function App({ user }: Props) {
    const navigate = useNavigate();

    const [data, setData] = useState<HomeData | null>(null);
    const [error, setError] = useState('');
    const [keyword, setKeyword] = useState('');

    // 공지사항. 비회원도 볼 수 있어서 로그인 여부와 상관없이 불러온다.
    const [notices, setNotices] = useState<Notice[]>([]);

    // 매물 비교 탭. 기본은 매매.
    const [compareTab, setCompareTab] = useState<DealTypeCode>('SALE');

    useEffect(() => {
        getHomeData()
            .then((result) => setData(result))
            .catch((err) => {
                console.error('메인 화면 데이터를 불러오지 못했습니다.', err);
                setError('화면 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
            });

        // 공지는 부가 정보라, 못 불러와도 메인 화면 전체를 막지 않고 그 영역만 비운다.
        getNotices()
            .then((result) => setNotices(result.slice(0, HOME_NOTICE_COUNT)))
            .catch((err) => console.error('공지사항을 불러오지 못했습니다.', err));
    }, []);

    const submitSearch = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        // 입력한 지역명을 지도 검색의 지역 필터로 넘긴다
        if (keyword.trim()) {
            navigate(`/map?keyword=${encodeURIComponent(keyword.trim())}`);
            return;
        }

        navigateOrNotice(MAP_ITEM, navigate);
    };

    // "나도 비교하기" — 내가 고른 매물로 비교하려면 관심 목록이 필요하고, 관심 목록은 로그인해야 쓸 수 있다.
    // 그래서 비회원에게는 안내만 하고, 로그인한 사용자는 관심 목록으로 보낸다.
    const startCompare = () => {
        if (!user) {
            window.alert('로그인 후 이용 가능한 서비스입니다.');
            return;
        }

        navigate('/favorites');
    };

    if (error) {
        return <div className="home-loading">{error}</div>;
    }

    if (!data) {
        return <div className="home-loading">불러오는 중입니다...</div>;
    }

    const cta = user ? ROLE_CTA[user.role] : GUEST_CTA;

    // 선택한 탭(매매/전세/월세)의 후보 매물. 길이 0~2가 그대로 화면 상태다.
    const compareItems = data.compare[COMPARE_TAB_KEYS[compareTab]];
    const hasFullComparePair = compareItems.length === 2;
    // 화면은 항상 2칸을 그리고, 없는 자리는 null로 채운다.
    const comparePair: (PropertyResponse | null)[] = [compareItems[0] ?? null, compareItems[1] ?? null];
    // 비교표에서 글자로 표시되는 행들. 2건이 다 있을 때만 계산한다.
    const compareRows = hasFullComparePair ? buildCompareRows(compareItems) : [];

    // 관리자로 로그인했을 때는 "오늘 처리할 일" 요약도 목차에 넣는다.
    // 목차는 화면에 나오는 순서와 같아야 한다. 이 구역은 목차 바 바로 다음에 렌더되는
    // 첫 구역이라 목록 맨 앞에 둔다.
    // 뒤에 넣으면 목록에는 맨 끝에 있는데 실제로는 맨 위에서 강조되는 자기모순이 생긴다.
    // (공통 SECTION_NAV_ITEMS 자체는 배경색 교대(toneOf) 계산에도 쓰이므로 손대지 않는다)
    const sectionNavItems = user?.role === 'ADMIN'
        ? [{ id: 's-admin-summary', label: '오늘 처리할 일' }, ...SECTION_NAV_ITEMS]
        : SECTION_NAV_ITEMS;

    return (
        <>
            
            <section className="home-hero">
                <div className="shot" style={{ backgroundImage: `url('${HERO_IMAGE}')` }} />
                <div className="veil" />

                <div className="inner">
                    <span className="pill">
                        <span className="dot" />
                        서초구 · 강남구 실거래가 반영 · 매주 갱신
                    </span>

                    <h1>호가 말고,<br /><em>시세</em>로 고르세요</h1>
                    <p className="sub">같은 동네 최근 거래와 나란히 놓고 봅니다. 합리적인 가격으로 나온 집이 먼저 보입니다.</p>

                    <form className="bigsearch" onSubmit={submitSearch}>
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
                            <circle cx="11" cy="11" r="7" /><path d="M20 20l-3.6-3.6" />
                        </svg>
                        <input
                            type="text"
                            placeholder="동 이름, 지하철역, 단지 이름을 넣어보세요"
                            aria-label="매물 검색"
                            value={keyword}
                            onChange={(e) => setKeyword(e.target.value)}
                        />
                        <button type="submit" className="go">매물 찾기</button>
                    </form>

                    <div className="quick">
                        {QUICK_KEYWORDS.map((word) => (
                            // 추천 키워드도 검색창에 친 것과 똑같이 검색어를 달고 지도 검색으로 넘어간다
                            <button
                                key={word}
                                onClick={() => navigate(`/map?keyword=${encodeURIComponent(word)}`)}
                            >
                                {word}
                            </button>
                        ))}
                    </div>
                </div>

                {/* 이번 주 저평가 매물 수. 히어로 우측 하단에 떠 있는 카드다.
                    건수(weeklyLowCount)는 지금 homeApi의 예시 데이터에서 오고,
                    서버에 /home 이 생기면 getHomeData() 안만 실제 호출로 바꾸면 이 화면은 그대로 쓴다. */}
                <div className="floatcard">
                    <div className="v">{data.weeklyLowCount}개</div>
                    <div className="k">이번 주 시세보다 <br />합리적인 가격으로 나온 매물</div>
                    <button className="go" onClick={() => navigateOrNotice(MAP_ITEM, navigate)}>
                        지금 보기
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                            <path d="M5 12h13M12 5l7 7-7 7" />
                        </svg>
                    </button>
                </div>
            </section>

            {/* 섹션 목차 (스크롤스파이) 
                히어로(검색창) 바로 아래 자리. 역할별 요약 스트립보다 위에 둬서
                어떤 역할로 들어와도 화면 이동 안내가 같은 위치에 있게 한다. */}
            <HomeSectionNav items={sectionNavItems} />

            {/*  역할별 요약 스트립 
                숫자만 보여 주는 자리. 목록 형태는 바로 아래 상세 블록에서 다룬다.
                중개인은 요약(오늘 매물 현황) 다음에 바로 처리할 목록(HomeBrokerDetail)이
                이어지도록 여기 붙여 둔다. 예전에는 이 상세 블록이 페이지 맨 아래에 있어서,
                공통 콘텐츠(공지·추천·동네 등)를 다 지나야 나왔다. */}
            {user?.role === 'BROKER' && (
                <>
                    <HomeBrokerSummary user={user} />
                    <HomeBrokerDetail />
                </>
            )}
            {user?.role === 'ADMIN' && <HomeAdminSummary id="s-admin-summary" />}

            {/*  공지사항 
                상단 메뉴에 있던 공지를 메인으로 내렸다.
                최근 몇 건만 걸어 두고, 전체는 공지사항 목록에서 본다.
                목차 바로 아래 자리라 여백을 줄이고 테두리 상자로 구분한다. */}
            <section className={`home-sec ${toneOf('s-notice')}`} id="s-notice">
                <div className="rv-wrap">
                    {/* 제목은 다른 섹션과 같은 규칙(.home-shead + h2)을 쓰고, 상자 안에는 목록만 남긴다 */}
                    <div className="home-shead">
                        <div>
                            <h2>공지사항</h2>
                        </div>
                        <button className="home-more" onClick={() => navigate('/notice')}>
                            전체 보기
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                                <path d="M5 12h13M12 5l7 7-7 7" />
                            </svg>
                        </button>
                    </div>

                    <div className="home-noticebox">
                        {notices.length === 0 ? (
                            <p className="empty">등록된 공지사항이 없습니다.</p>
                        ) : (
                            <ul className="home-noticelist">
                                {notices.map((notice) => (
                                    <li key={notice.id}>
                                        <button onClick={() => navigate(`/notice/${notice.id}`)}>
                                            <span className="ttl">{notice.title}</span>
                                            <span className="date">{notice.createdAt?.slice(0, 10)}</span>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </section>

            {/*  01 바로가기  */}
            <section className={`home-sec ${toneOf('s-shortcuts')}`} id="s-shortcuts">
                <div className="rv-wrap">
                    <div className="home-shead">
                        <div>
                            <h2>어디서부터 찾을까요</h2>
                            <p>지도로 훑어도 되고, 동네 성격부터 골라도 됩니다.</p>
                        </div>
                    </div>

                    <div className="home-shortcuts">
                        {SHORTCUTS.map((item) => (
                            <button
                                key={item.label}
                                className="home-sc"
                                onClick={() => navigateOrNotice(item, navigate)}
                            >
                                <div className="ph" style={{ backgroundImage: `url('${item.image}')` }} />
                                <div className="ov" />
                                <span className="arrow">
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                                        <path d="M7 17L17 7M17 7H9M17 7v8" />
                                    </svg>
                                </span>
                                <div className="txt">
                                    <h3>{item.label}</h3>
                                    <p>{item.desc}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </section>

            {/*  맞춤 추천 (비회원은 잠금)  */}
            <HomeRecommend id="s-recommend" tone={toneOf('s-recommend')} user={user} items={data.recommendations} />

            {/*  02 이번 주 매물  */}
            <section className={`home-sec ${toneOf('s-weekly')}`} id="s-weekly">
                <div className="rv-wrap">
                    <div className="home-shead">
                        <div>
                            <h2>이번 주, 시세보다 합리적인 가격으로 나온 집</h2>
                            <p>
                                관리자가 동네 시세 대비 저평가로 표시한 매물만 모았습니다.
                            </p>
                        </div>
                        <button className="home-more" onClick={() => navigateOrNotice(MAP_ITEM, navigate)}>
                            전체 {data.weeklyLowCount}건 보기
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                                <path d="M5 12h13M12 5l7 7-7 7" />
                            </svg>
                        </button>
                    </div>

                    <div className="home-plist">
                        {data.weeklyProperties.map((property) => (
                            <button
                                key={property.id}
                                className="home-pcard"
                                onClick={() => navigate(`/property/${property.id}`)}
                            >
                                <div className="ph" style={{ backgroundImage: `url('${property.imageUrl}')` }}>
                                    <span className={`home-badge ${PRICE_EVALUATION_CLASS[property.priceEvaluation]} bd`}>
                                        {PRICE_EVALUATION_LABEL[property.priceEvaluation]}
                                    </span>
                                </div>
                                <div className="pb">
                                    <div className="price">{property.priceLabel}</div>
                                    <div className="meta">{property.summary}</div>

                                    <div className="foot">
                                        <span className="rv-xs rv-dim">{property.transit}</span>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </section>

            {/*  02b 매물 비교해보기 
                거래유형(매매/전세/월세)별로 실제로 합산 순위가 가장 좋은 매물과 가장 안 좋은
                매물 한 쌍을 보여준다(GET /property/home-compare). 어느 쪽이 나은지는 실제로
                계산해서 강조한다(HomeCompareMapper). 후보가 2건이 안 되면 표를 흐리게 가리고
                안내 문구를 띄운다. 직접 고른 매물로 비교하려면 관심 목록이 있어야 해서 로그인이 필요하다. */}
            <section className={`home-sec ${toneOf('s-compare')}`} id="s-compare">
                <div className="rv-wrap">
                    <div className="home-shead">
                        <div>
                            <h2>
                                두 집, 나란히 비교해보세요
                                <span className="home-loginbadge">로그인 후 이용 가능</span>
                            </h2>
                            <p>
                                거래유형별로 여러 조건을 종합해 가장 나은 매물과 덜 나은 매물을 골라 보여드립니다.
                                내가 고른 매물로 비교하려면 로그인 후 관심 목록에서 두 개를 선택하세요.
                            </p>
                        </div>
                        <button className="home-more" onClick={startCompare}>
                            나도 비교하기
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                                <path d="M5 12h13M12 5l7 7-7 7" />
                            </svg>
                        </button>
                    </div>

                    <div className="home-comparetabs">
                        {COMPARE_TABS.map((tab) => (
                            <button
                                key={tab}
                                type="button"
                                className={`home-comparetab ${tab === compareTab ? 'active' : ''}`}
                                onClick={() => setCompareTab(tab)}
                            >
                                {DEAL_TYPE_LABELS[tab]}
                            </button>
                        ))}
                    </div>

                    <div className="home-comparewrap">
                        {!hasFullComparePair && (
                            <div className="home-cmplock-notice">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
                                    <path d="M12 9v4M12 17h.01" strokeLinecap="round" />
                                    <circle cx="12" cy="12" r="9" />
                                </svg>
                                <strong>비교할 매물이 부족합니다</strong>
                                <p>{DEAL_TYPE_LABELS[compareTab]} 매물이 더 등록되면 자동으로 채워집니다.</p>
                            </div>
                        )}

                        <table
                            className={`home-comparetable ${!hasFullComparePair ? 'home-cmplock-blur' : ''}`}
                            aria-hidden={!hasFullComparePair}
                        >
                            <thead>
                            <tr>
                                <th>비교 항목</th>
                                {comparePair.map((item, index) => (
                                    <th key={item?.id ?? `empty-${index}`}>
                                        {item ? item.name : '매물 없음'}
                                        <span className="hood">
                                                {item ? [item.sigungu, item.dong].filter(Boolean).join(' ') : ''}
                                            </span>
                                    </th>
                                ))}
                            </tr>
                            </thead>
                            <tbody>
                            <tr>
                                <th scope="row">사진</th>
                                {comparePair.map((item, index) => (
                                    <td key={item?.id ?? `empty-${index}`}>
                                        <button
                                            type="button"
                                            className="home-comparephoto"
                                            style={{ backgroundImage: item ? `url('${item.images[0]?.url ?? ''}')` : undefined }}
                                            aria-label={item ? `${item.name} 상세 보기` : '매물 없음'}
                                            disabled={!item}
                                            onClick={() => item && navigate(`/property/${item.id}`)}
                                        />
                                    </td>
                                ))}
                            </tr>

                            {compareRows.map((row) => (
                                <tr key={row.label}>
                                    <th scope="row">{row.label}</th>
                                    {row.values.map((value, index) => (
                                        <td
                                            key={comparePair[index]?.id ?? `empty-${index}`}
                                            className={index === row.winnerIndex ? 'hl' : undefined}
                                        >
                                            {value}
                                            {index === row.winnerIndex && <span className="check">✓</span>}
                                        </td>
                                    ))}
                                </tr>
                            ))}

                            <tr>
                                <th scope="row">주변 환경</th>
                                {comparePair.map((item, index) => (
                                    <td key={item?.id ?? `empty-${index}`}>
                                        <div className="home-comparetags">
                                            {item?.tags.slice(0, COMPARE_TAG_LIMIT).map((tag) => (
                                                <span key={tag.id}>{tag.name}</span>
                                            ))}
                                        </div>
                                    </td>
                                ))}
                            </tr>

                            <tr>
                                <th scope="row" />
                                {comparePair.map((item, index) => (
                                    <td key={item?.id ?? `empty-${index}`}>
                                        {item && (
                                            <button
                                                type="button"
                                                className="home-comparelink"
                                                onClick={() => navigate(`/property/${item.id}`)}
                                            >
                                                상세 보기
                                            </button>
                                        )}
                                    </td>
                                ))}
                            </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            {/*  03 동네 둘러보기  */}
            <section className={`home-sec ${toneOf('s-neighborhood')}`} id="s-neighborhood">
                <div className="rv-wrap">
                    <div className="home-shead">
                        <div>
                            <h2>동네부터 고르는 방법</h2>
                            <p>비슷한 성격의 동네끼리 묶어 두었습니다. 마음에 드는 쪽에서 집을 찾으세요.</p>
                        </div>
                        <button className="home-more" onClick={() => navigateOrNotice(NEIGHBORHOOD_ITEM, navigate)}>
                            동네 전체 보기
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                                <path d="M5 12h13M12 5l7 7-7 7" />
                            </svg>
                        </button>
                    </div>

                    <div className="home-hoods">
                        {/* 첫 번째 동네는 크게, 나머지 둘은 오른쪽에 위아래로 */}
                        {data.neighborhoods.slice(0, 1).map((hood) => (
                            <button
                                key={hood.id}
                                className="home-hood tall"
                                onClick={() => navigateOrNotice(NEIGHBORHOOD_ITEM, navigate)}
                            >
                                <div className={`ph${hood.imageUrl ? '' : ' no-photo'}`}
                                     style={hood.imageUrl ? { backgroundImage: `url('${hood.imageUrl}')` } : undefined}>
                                    {!hood.imageUrl && (
                                        <NeighborhoodMap city="서울시" district={hood.district} dong={hood.name} />
                                    )}
                                </div>
                                <div className="ov" />
                                <div className="txt">
                                    <span className="kind">{hood.kind}</span>
                                    <h3>{hood.name}</h3>
                                    <div className="line">
                                        {hood.stats.map((stat) => <span key={stat}>{stat}</span>)}
                                    </div>
                                    <div className="htags">
                                        {hood.tags.map((tag) => <span key={tag}>{tag}</span>)}
                                    </div>
                                </div>
                            </button>
                        ))}

                        <div className="col">
                            {data.neighborhoods.slice(1, 3).map((hood) => (
                                <button
                                    key={hood.id}
                                    className="home-hood short"
                                    onClick={() => navigateOrNotice(NEIGHBORHOOD_ITEM, navigate)}
                                >
                                    <div className={`ph${hood.imageUrl ? '' : ' no-photo'}`}
                                         style={hood.imageUrl ? { backgroundImage: `url('${hood.imageUrl}')` } : undefined}>
                                        {!hood.imageUrl && (
                                            <NeighborhoodMap city="서울시" district={hood.district} dong={hood.name} />
                                        )}
                                    </div>
                                    <div className="ov" />
                                    <div className="txt">
                                        <span className="kind">{hood.kind}</span>
                                        <h3>{hood.name}</h3>
                                        <div className="line">
                                            {hood.stats.map((stat) => <span key={stat}>{stat}</span>)}
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/*  04 동네 이야기  */}
            <section className={`home-sec ${toneOf('s-voices')}`} id="s-voices">
                <div className="rv-wrap">
                    <div className="home-shead">
                        <div>
                            <h2>살아본 사람들의 말</h2>
                            <p>숫자로는 안 나오는 것들이 있습니다. 주차 자리, 언덕, 밤에 조용한지.</p>
                        </div>
                        <button className="home-more" onClick={() => navigateOrNotice(NEIGHBORHOOD_ITEM, navigate)}>
                            동네별로 보기
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                                <path d="M5 12h13M12 5l7 7-7 7" />
                            </svg>
                        </button>
                    </div>

                    <div className="home-storygrid">
                        <div>
                            {data.voices.map((voice) => (
                                <div className="home-voice" key={voice.id}>
                                    <div className="vh">
                                        <span className="who">{voice.neighborhood}</span>
                                        <span className="rv-xs rv-dim">{voice.createdAt}</span>
                                    </div>
                                    <p>{voice.content}</p>
                                </div>
                            ))}
                        </div>

                        <div className="home-cloudbox">
                            <span className="rv-xs rv-dim">서울 전체 한줄평에서 자주 나온 말</span>
                            <img
                                className="home-cloudimg"
                                src={WORDCLOUD_IMAGE}
                                alt={`한줄평에서 자주 나온 말 ${WORDCLOUD_TOP_WORDS.join(', ')} 등을 크기로 표현한 워드클라우드`}
                                width={1200}
                                height={900}
                                loading="lazy"
                            />
                            <p className="rv-xs rv-dim" style={{ marginTop: 22 }}>
                                글자가 클수록 많이 나온 말입니다. 한줄평 {WORDCLOUD_SOURCE_COUNT}건에서 골랐습니다.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/*  05 이용 방법  */}
            <section className={`home-sec ${toneOf('s-hows')}`} id="s-hows">
                <div className="rv-wrap">
                    <div className="home-shead">
                        <div>
                            <h2>어렵지 않습니다</h2>
                            <p>세 가지만 알면 됩니다.</p>
                        </div>
                    </div>

                    <div className="home-hows">
                        <div className="home-how">
                            <div className="ic">
                                <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3">
                                    <path d="M4 19V9M10 19V5M16 19v-7M22 19H2" />
                                </svg>
                            </div>
                            <h3>동네 시세와 나란히 봅니다</h3>
                            <p>
                                같은 동네, 비슷한 면적의 최근 거래를 모아 이 집이 그보다 싼지 비싼지 보여드립니다.
                                실거래가는 공공 데이터를 그대로 씁니다.
                            </p>
                        </div>

                        <div className="home-how">
                            <div className="ic">
                                <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3">
                                    <path d="M12 3l2.6 5.6 6 .8-4.4 4.2 1.1 6L12 16.8 6.7 19.6l1.1-6L3.4 9.4l6-.8z" />
                                </svg>
                            </div>
                            <h3>취향을 기억합니다</h3>
                            <p>
                                집 몇 개에 평가를 매겨두면 다음부터는 그 기준으로 골라 보여드립니다.
                                역이 가까운 게 중요한지, 해가 잘 드는 게 중요한지 알아둡니다.
                            </p>
                        </div>

                        <div className="home-how">
                            <div className="ic">
                                <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3">
                                    <path d="M18 9a6 6 0 1 0-12 0c0 6-2 7-2 7h16s-2-1-2-7" />
                                    <path d="M13.7 20a2 2 0 0 1-3.4 0" />
                                </svg>
                            </div>
                            <h3>새 집이 나오면 알려드립니다</h3>
                            <p>
                                관심 지역을 등록해두면 매주 새 매물을 살펴서,
                                시세보다 합리적인 가격으로 나온 집이 생겼을 때만 알림을 보냅니다.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/*  역할별 상세 블록 
                공통 콘텐츠를 다 본 뒤 "그래서 무엇을 처리하나"로 이어지는 자리.
                중개인의 "처리할 내 매물"은 여기 없다 — 오늘 매물 현황(HomeBrokerSummary) 바로
                아래로 옮겼다. 둘 다 "내가 지금 뭘 해야 하나"를 다루는 같은 맥락이라 붙여 둔다. */}
            {user?.role === 'ADMIN' && <HomeAdminDetail />}

            {/*  마무리 안내  */}
            <section className="home-cta">
                <div className="ph" style={{ backgroundImage: `url('${CTA_IMAGE}')` }} />
                <div className="ov" />
                <div className="inner rv-wrap">
                    <h2>{cta.title}</h2>
                    <p>{cta.desc}</p>
                    <div className="btns">
                        <button className="home-btn fill" onClick={() => navigate(cta.primary.path)}>
                            {cta.primary.label}
                        </button>
                        <button className="home-btn line" onClick={() => navigate(cta.secondary.path)}>
                            {cta.secondary.label}
                        </button>
                    </div>
                </div>
            </section>
        </>
    );
};

export default App;
