import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { getHomeData } from "../api/homeApi";
import { getNotices } from "../api/noticeApi";
import type { HomeData, PriceLevel } from "../types/Home";
import type { Notice } from "../types/Notice";
import type { NavItem } from "../types/Navigation";
import { navigateOrNotice } from "../utils/navigateOrNotice";
import "../styles/HomePage.css";

// 히어로/CTA 배경처럼 화면 장식으로만 쓰는 사진.
// 매물·동네 사진과 달리 서버에서 받아올 값이 아니라서 여기에 상수로 둔다.
const HERO_IMAGE = 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=70';
const CTA_IMAGE = 'https://images.unsplash.com/photo-1449844908441-8829872d2607?auto=format&fit=crop&w=1600&q=70';

// 바로가기 4장. 이동 대상이 아직 없는 화면이라 ready: false로 두고,
// 페이지가 만들어지면 types/Navigation.ts와 같은 방식으로 true로 바꾸면 된다.
const SHORTCUTS: (NavItem & { desc: string; image: string })[] = [
    {
        label: '지도 검색', path: '/map', ready: false,
        desc: '가격대별로 색이 다른 마커로 시세 분포를 한눈에',
        image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=70',
    },
    {
        label: '동네 탐색', path: '/neighborhood', ready: false,
        desc: '조용한 곳, 역 가까운 곳, 새 건물 많은 곳',
        image: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=800&q=70',
    },
    {
        label: '맞춤 추천', path: '/recommend', ready: false,
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
const HOME_NOTICE_COUNT = 3;

// 시세 평가 값을 배지 색 클래스로 바꾼다.
const LEVEL_CLASS: Record<PriceLevel, string> = {
    LOW: 'low',
    MID: 'mid',
    HIGH: 'high',
};

const MAP_ITEM: NavItem = { label: '지도 검색', path: '/map', ready: false };
const NEIGHBORHOOD_ITEM: NavItem = { label: '동네 탐색', path: '/neighborhood', ready: false };

function App() {
    const navigate = useNavigate();

    const [data, setData] = useState<HomeData | null>(null);
    const [error, setError] = useState('');
    const [keyword, setKeyword] = useState('');

    // 공지사항. 비회원도 볼 수 있어서 로그인 여부와 상관없이 불러온다.
    const [notices, setNotices] = useState<Notice[]>([]);

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
        // 지도 검색 페이지가 생기면 navigate(`/map?keyword=${keyword}`)로 바꾼다.
        navigateOrNotice(MAP_ITEM, navigate);
    };

    if (error) {
        return <div className="home-loading">{error}</div>;
    }

    if (!data) {
        return <div className="home-loading">불러오는 중입니다...</div>;
    }

    return (
        <>
            {/* ── 히어로 ─────────────────────────────────────── */}
            <section className="home-hero">
                <div className="shot" style={{ backgroundImage: `url('${HERO_IMAGE}')` }} />
                <div className="veil" />

                <div className="inner">
                    <span className="pill">
                        <span className="dot" />
                        서초구 · 강남구 실거래가 반영 · 매주 갱신
                    </span>

                    <h1>호가 말고,<br /><em>시세</em>로 고르세요</h1>
                    <p className="sub">같은 동네 최근 거래와 나란히 놓고 봅니다. 싸게 나온 집이 먼저 보입니다.</p>

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
                            <button key={word} onClick={() => navigateOrNotice(MAP_ITEM, navigate)}>
                                {word}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="floatcard">
                    <div className="v rv-num">{data.weeklyLowCount}</div>
                    <div className="k">이번 주 시세보다 싸게 나온 매물</div>
                    <button className="go" onClick={() => navigateOrNotice(MAP_ITEM, navigate)}>
                        지금 보기
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                            <path d="M5 12h13M12 5l7 7-7 7" />
                        </svg>
                    </button>
                </div>
            </section>

            {/* ── 01 바로가기 ────────────────────────────────── */}
            <section className="home-sec">
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

            {/* ── 공지사항 ───────────────────────────────────
                상단 메뉴에 있던 공지를 메인으로 내렸다.
                최근 몇 건만 걸어 두고, 전체는 공지사항 목록에서 본다.
                위쪽 섹션과 이어지는 자리라 여백을 줄이고 테두리 상자로 구분한다. */}
            <section className="home-sec" style={{ paddingTop: 0, paddingBottom: 56 }}>
                <div className="rv-wrap">
                    <div
                        style={{
                            border: '1px solid var(--line)',
                            borderRadius: 14,
                            padding: '22px 26px',
                            background: '#fff',
                        }}
                    >
                        <div className="row between" style={{ alignItems: 'baseline' }}>
                            <h3 style={{ margin: 0, fontSize: 17 }}>공지사항</h3>
                            <button
                                onClick={() => navigate('/notice')}
                                style={{ fontSize: 13, color: 'var(--v)' }}
                            >
                                전체 보기 →
                            </button>
                        </div>

                        {notices.length === 0 ? (
                            <p style={{ marginTop: 14, fontSize: 13.5, color: 'var(--ink-3)' }}>
                                등록된 공지사항이 없습니다.
                            </p>
                        ) : (
                            <div style={{ marginTop: 14, display: 'grid', gap: 2 }}>
                                {notices.map((notice) => (
                                    <button
                                        key={notice.id}
                                        onClick={() => navigate(`/notice/${notice.id}`)}
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            gap: 16,
                                            padding: '9px 0',
                                            width: '100%',
                                            textAlign: 'left',
                                            fontSize: 14,
                                            color: 'var(--ink-2)',
                                        }}
                                    >
                                        <span
                                            style={{
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                            }}
                                        >
                                            {notice.title}
                                        </span>
                                        <span style={{ fontSize: 12.5, color: 'var(--ink-3)', flexShrink: 0 }}>
                                            {notice.createdAt?.slice(0, 10)}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* ── 02 이번 주 매물 ────────────────────────────── */}
            <section className="home-sec alt">
                <div className="rv-wrap">
                    <div className="home-shead">
                        <div>
                            <h2>이번 주, 시세보다 싸게 나온 집</h2>
                            <p>
                                같은 동네 비슷한 면적의 최근 거래와 비교했습니다.
                                가운데 선이 동네 시세, 점이 이 집의 호가입니다.
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
                                    <span className={`home-badge ${LEVEL_CLASS[property.level]} bd`}>
                                        {property.diffLabel}
                                    </span>
                                </div>
                                <div className="pb">
                                    <div className="rv-num price">{property.priceLabel}</div>
                                    <div className="meta">{property.summary}</div>

                                    {/* 시세 막대: 가운데(50%)가 동네 평균, 점이 이 매물 위치 */}
                                    <div className="home-gauge">
                                        <div className="track">
                                            <div
                                                className="fill"
                                                style={{
                                                    left: `${Math.min(property.gaugePosition, 50)}%`,
                                                    width: `${Math.abs(50 - property.gaugePosition)}%`,
                                                }}
                                            />
                                            <div className="base" />
                                            <div className="pin" style={{ left: `${property.gaugePosition}%` }} />
                                        </div>
                                    </div>

                                    <div className="foot">
                                        <span className="rv-xs rv-dim">{property.transit}</span>
                                        <span className="diff">{property.marketPriceLabel}</span>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── 03 동네 둘러보기 ───────────────────────────── */}
            <section className="home-sec">
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
                                <div className="ph" style={{ backgroundImage: `url('${hood.imageUrl}')` }} />
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
                                    <div className="ph" style={{ backgroundImage: `url('${hood.imageUrl}')` }} />
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

            {/* ── 04 동네 이야기 ─────────────────────────────── */}
            <section className="home-sec alt">
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
                            <span className="rv-xs rv-dim">{data.cloudNeighborhood}에서 자주 나온 말</span>
                            <div className="home-cloud">
                                {data.cloudWords.map((word) => (
                                    <span key={word.text} className={`w${word.weight}`}>{word.text}</span>
                                ))}
                            </div>
                            <p className="rv-xs rv-dim" style={{ marginTop: 22 }}>
                                글자가 클수록 많이 나온 말입니다. 한줄평 {data.cloudSourceCount}건에서 골랐습니다.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── 05 이용 방법 ───────────────────────────────── */}
            <section className="home-sec">
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
                                시세보다 싸게 나온 집이 생겼을 때만 알림을 보냅니다.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── 가입 유도 ──────────────────────────────────── */}
            <section className="home-cta">
                <div className="ph" style={{ backgroundImage: `url('${CTA_IMAGE}')` }} />
                <div className="ov" />
                <div className="inner rv-wrap">
                    <h2>다음 집은 제값에 구하세요</h2>
                    <p>회원가입하고 마음에 드는 집 몇 개만 골라 두면, 그다음부터는 알아서 찾아 드립니다.</p>
                    <div className="btns">
                        <button className="home-btn fill" onClick={() => navigate('/member/signup')}>
                            회원가입
                        </button>
                        <button className="home-btn line" onClick={() => navigateOrNotice(MAP_ITEM, navigate)}>
                            먼저 둘러보기
                        </button>
                    </div>
                </div>
            </section>
        </>
    );
};

export default App;
