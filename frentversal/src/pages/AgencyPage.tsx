import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import { getAgencies } from '../api/agencyApi';
import AgencyMap from './components/AgencyMap';
import type { AgencyResponse, AgencyStatus } from '../types/Agency';
import { SEOUL_DISTRICTS, dongOptionsOf } from '../utils/seoulDistricts';
import '../styles/AgencyPage.css';

// 프로토타입 agency.html 을 옮긴 화면입니다.
// 중개사무소 목록은 백엔드 GET /agency 에서 받아옵니다.
// 상단 네비게이션바는 공통 컴포넌트(ui/MenuItems.tsx)가 App.tsx 에서 그리므로 이 화면에는 없습니다.
// assets/app.js 가 DOM 을 직접 조작하던 부분(토스트, 챗봇)은 state 로 대체했습니다.

// 상담 상태 코드 -> 배지 색상 (common.css 의 .status.green / .orange / .gray)
// 색상은 화면 표현이므로 서버가 아니라 여기서 매핑합니다.
const STATUS_COLORS: Record<AgencyStatus, string> = {
    AVAILABLE: 'green',
    RESERVED: 'orange',
    CLOSED: 'gray',
};

// 지역 필터 (option 의 value 가 그대로 서버로 넘어가 주소·동 조회에 쓰입니다)
// 구 목록과 구별 동 목록은 utils/seoulDistricts 에 모아 두고 화면끼리 함께 씁니다.

// 목록에 한 번에 보여 줄 중개사무소 카드 수. 화살표를 누르면 이만큼씩 옆으로 넘어간다.
// .grid-4 가 한 줄에 4칸이라 이 값과 맞춰 둔다.
const CARDS_PER_PAGE = 4;

const CHAT_QUICK = ['강남역 5억 이하', '조용한 동네 추천', '이 집 시세가 적당해?'];

const BOT_REPLY = '조건을 분석했습니다. 예산과 선호 지역을 기준으로 시세보다 낮은 매물을 우선 보여드릴게요.';

interface ChatMessage {
    id: number;
    text: string;
    mine: boolean;
}

function AgencyPage() {
    // 중개사무소 목록 (서버에서 받아옵니다)
    const [agencies, setAgencies] = useState<AgencyResponse[]>([]);
    const [verifiedCount, setVerifiedCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');

    // 검색 조건
    const [keyword, setKeyword] = useState('');
    const [region, setRegion] = useState('');
    const [dong, setDong] = useState('');

    // 지금 몇 번째 묶음(4개씩)을 보고 있는지. 화살표로만 바뀐다.
    const [cardPage, setCardPage] = useState(0);

    // 토스트
    const [toastMessage, setToastMessage] = useState('');
    const [toastVisible, setToastVisible] = useState(false);
    const toastTimer = useRef<number | undefined>(undefined);

    const showToast = (message: string) => {
        setToastMessage(message);
        setToastVisible(true);
        window.clearTimeout(toastTimer.current);
        toastTimer.current = window.setTimeout(() => setToastVisible(false), 1800);
    };

    useEffect(() => () => window.clearTimeout(toastTimer.current), []);

    // 목록 조회. 검색 버튼과 첫 진입에서 모두 이 함수를 씁니다.
    const loadAgencies = async (params: { keyword?: string; region?: string; dong?: string } = {}) => {
        setLoading(true);
        setLoadError('');

        try {
            const data = await getAgencies(params);

            setAgencies(data.content);
            setVerifiedCount(data.verifiedCount);
            setCardPage(0); // 검색 결과가 바뀌면 항상 첫 묶음부터 보여 준다
        } catch (error) {
            console.error('중개사무소 목록 조회 실패', error);
            setLoadError('중개사무소 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
            setAgencies([]);
        } finally {
            setLoading(false);
        }
    };

    // 화면에 처음 들어왔을 때 전체 목록을 불러옵니다.
    useEffect(() => {
        loadAgencies();
    }, []);

    const handleSearch = () => {
        loadAgencies({ keyword, region, dong });
        showToast('검색 조건을 적용했습니다.');
    };

    // 사무소 목록을 4개씩 잘라 "한 화면"에 담을 묶음들로 만든다.
    const agencyPages = useMemo(() => {
        const pages: AgencyResponse[][] = [];

        for (let index = 0; index < agencies.length; index += CARDS_PER_PAGE) {
            pages.push(agencies.slice(index, index + CARDS_PER_PAGE));
        }

        return pages;
    }, [agencies]);

    const isFirstPage = cardPage === 0;
    const isLastPage = cardPage >= agencyPages.length - 1;

    // 챗봇
    const [chatOpen, setChatOpen] = useState(false);
    const [chatInput, setChatInput] = useState('');
    const [messages, setMessages] = useState<ChatMessage[]>([
        { id: 0, text: '안녕하세요. 지역, 예산, 원하는 생활환경을 알려주시면 조건에 맞는 집을 찾아드릴게요.', mine: false },
    ]);
    const chatBodyRef = useRef<HTMLDivElement>(null);
    const messageId = useRef(1);
    const replyTimer = useRef<number | undefined>(undefined);

    const sendMessage = (text: string) => {
        if (!text.trim()) return;
        setMessages((prev) => [...prev, { id: messageId.current++, text, mine: true }]);
        replyTimer.current = window.setTimeout(() => {
            setMessages((prev) => [...prev, { id: messageId.current++, text: BOT_REPLY, mine: false }]);
        }, 250);
    };

    useEffect(() => () => window.clearTimeout(replyTimer.current), []);

    // 새 메시지가 쌓이면 항상 아래로 스크롤
    useEffect(() => {
        const body = chatBodyRef.current;
        if (body) body.scrollTop = body.scrollHeight;
    }, [messages]);

    const handleChatSend = () => {
        sendMessage(chatInput);
        setChatInput('');
    };

    return (
        <>
            <main>
                <section className="page-hero">
                    <div className="wrap">
                        <div>
                            <div className="eyebrow">Agency</div>
                            <h1>중개사무소 안내</h1>
                            <p>검증된 공인중개사와 등록 매물을 지역별로 확인하고 상담을 요청할 수 있습니다.</p>
                        </div>
                        <div className="hero-stat">
                            <span className="mono dim">인증 중개사무소</span>
                            <strong>{verifiedCount}곳</strong>
                            <span className="xs dim"></span>
                        </div>
                    </div>
                </section>

                <section className="section">
                    <div className="wrap">
                        <div className="toolbar">
                            <input
                                className="search-box"
                                placeholder="중개사무소명, 공인중개사 검색"
                                value={keyword}
                                onChange={(event) => setKeyword(event.target.value)}
                                onKeyDown={(event) => { if (event.key === 'Enter') handleSearch(); }}
                            />
                            {/* 구를 고른 뒤 동을 더 좁힐 수 있습니다. 구를 안 골랐으면 동은 고를 수 없습니다. */}
                            <select
                                className="search-box"
                                value={region}
                                onChange={(event) => { setRegion(event.target.value); setDong(''); }}
                            >
                                <option value="">지역 전체</option>
                                {SEOUL_DISTRICTS.map((district) => (
                                    <option value={district} key={district}>{district}</option>
                                ))}
                            </select>
                            <select
                                className="search-box"
                                value={dong}
                                onChange={(event) => setDong(event.target.value)}
                                disabled={!region}
                            >
                                <option value="">동 전체</option>
                                {dongOptionsOf(region).map((item) => (
                                    <option value={item.value} key={item.value}>{item.label}</option>
                                ))}
                            </select>
                            <button className="solid-btn" onClick={handleSearch} disabled={loading}>
                                {loading ? '불러오는 중' : '검색'}
                            </button>
                        </div>

                        {loadError && <p className="xs" style={{ color: 'var(--red)' }}>{loadError}</p>}

                        {!loading && !loadError && agencies.length === 0 && (
                            <p className="xs dim">조건에 맞는 중개사무소가 없습니다.</p>
                        )}

                        {/* 카드는 4개씩만 보여 주고, 나머지는 양옆 화살표로 넘겨서 본다 */}
                        {agencyPages.length > 0 && (
                            <div className="agency-carousel">
                                <button
                                    className={`agency-carousel-arrow${agencyPages.length <= 1 ? ' is-hidden' : ''}`}
                                    type="button"
                                    aria-label="이전 중개사무소 보기"
                                    onClick={() => setCardPage((current) => Math.max(0, current - 1))}
                                    disabled={isFirstPage}
                                >
                                    ‹
                                </button>

                                <div className="agency-carousel-viewport">
                                    <div
                                        className="agency-carousel-track"
                                        style={{ transform: `translateX(-${cardPage * 100}%)` }}
                                    >
                                        {agencyPages.map((pageAgencies) => (
                                            <div className="agency-carousel-page" key={pageAgencies[0].id}>
                                                <div className="grid-4">
                                                    {pageAgencies.map((agency) => (
                                                        <Link className="card" to={`/agency/${agency.id}`} key={agency.id}>
                                                            <div className="row between">
                                                                <span className={`status ${STATUS_COLORS[agency.status]}`}>{agency.statusLabel}</span>
                                                                <div className="avatar">{agency.brokerName.charAt(0)}</div>
                                                            </div>
                                                            <h3 style={{ marginTop: 13 }}>
                                                                {agency.name}
                                                                {agency.verified && <span className="xs" style={{ marginLeft: 6, color: 'var(--green)' }}>✓ 인증</span>}
                                                            </h3>
                                                            <p className="xs dim" style={{ marginTop: 6 }}>
                                                                {agency.brokerName} 공인중개사<br />
                                                                {agency.address}
                                                                {agency.hours && <><br />{agency.hours}</>}
                                                            </p>
                                                            <div className="divider" style={{ margin: '15px 0' }}></div>
                                                            <div className="row between">
                                                                <span className="xs dim">★ {agency.ratingAvg.toFixed(1)}</span>
                                                                <strong className="num">{agency.listingCount}건</strong>
                                                            </div>
                                                        </Link>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <button
                                    className={`agency-carousel-arrow${agencyPages.length <= 1 ? ' is-hidden' : ''}`}
                                    type="button"
                                    aria-label="다음 중개사무소 보기"
                                    onClick={() => setCardPage((current) => Math.min(agencyPages.length - 1, current + 1))}
                                    disabled={isLastPage}
                                >
                                    ›
                                </button>
                            </div>
                        )}

                        <div className="section-head" style={{ marginTop: 48 }}>
                            <div>
                                <h2>내 근처 중개사무소</h2>
                                <p>현재 위치 또는 선택한 동네를 기준으로 가까운 곳을 보여줍니다.</p>
                            </div>
                            <button className="outline-btn" onClick={() => showToast('현재 위치를 확인했습니다.')}>내 위치 사용</button>
                        </div>

                        {/* 지도는 카카오맵 API 로 그립니다. 마커 좌표는 서버가 내려주는 latitude/longitude 를 씁니다. */}
                        <AgencyMap agencies={agencies} />
                    </div>
                </section>
            </main>



            <button className="chat-fab" aria-label="AI 챗봇 열기" onClick={() => setChatOpen((open) => !open)}>✦</button>

            <section className={`chat-panel${chatOpen ? ' open' : ''}`} aria-label="AI 챗봇">
                <div className="chat-head">
                    <div>
                        <strong>전세역전 AI</strong>
                        <div className="xs dim">매물·동네·시세를 물어보세요</div>
                    </div>
                    <button onClick={() => setChatOpen(false)}>×</button>
                </div>
                <div className="chat-body" ref={chatBodyRef}>
                    {messages.map((message) => (
                        <div className={`chat-msg${message.mine ? ' me' : ''}`} key={message.id}>{message.text}</div>
                    ))}
                </div>
                <div className="chat-quick">
                    {CHAT_QUICK.map((text) => (
                        <button key={text} onClick={() => sendMessage(text)}>{text}</button>
                    ))}
                </div>
                <div className="chat-input">
                    <input
                        placeholder="질문을 입력하세요"
                        value={chatInput}
                        onChange={(event) => setChatInput(event.target.value)}
                        onKeyDown={(event) => { if (event.key === 'Enter') handleChatSend(); }}
                    />
                    <button className="solid-btn" onClick={handleChatSend}>전송</button>
                </div>
            </section>

            <div className={`toast${toastVisible ? ' show' : ''}`}>{toastMessage}</div>
        </>
    );
}

export default AgencyPage;
