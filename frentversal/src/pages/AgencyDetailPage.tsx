import axios from 'axios';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';

import {
    canWriteReview,
    getAgencyDetail,
    getAgencyReviews,
    requestConsultation,
    writeReview,
} from '../api/agencyApi';
import AgencyMap from './components/AgencyMap';
import type { AgencyDetail, AgencyReview, AgencyStatus } from '../types/Agency';
import type { NavItem } from '../types/Navigation';
import type { User } from '../types/User';
import { navigateOrNotice } from '../utils/navigateOrNotice';

// 중개사무소 상세 페이지 (프로토타입 agency-detail.html 기준)
// 중개사무소 안내 목록에서 카드를 누르면 /agency/:id 로 들어온다.
// 상단 네비게이션바와 푸터는 App.tsx 의 공통 컴포넌트가 그리므로 여기에는 없다.

// 상담 상태 코드 -> 배지 색상 (common.css 의 .status.green / .orange / .gray)
// "전체 N건" 버튼이 가려는 지도 검색 화면.
// 지도 검색이 keyword 파라미터를 지역 필터로 받으므로, 사무소가 있는 지역으로 넘긴다.
const MAP_SEARCH_ITEM: NavItem = { label: '지도 검색', path: '/map', ready: true };

const STATUS_COLORS: Record<AgencyStatus, string> = {
    AVAILABLE: 'green',
    RESERVED: 'orange',
    CLOSED: 'gray',
};

interface Props {
    user: User | null; // 로그인한 사용자 (상담 요청·후기 작성에 필요)
}

// 별점 숫자를 ★★★★☆ 모양으로 바꾼다.
function toStars(rating: number) {
    const filled = Math.round(rating);

    return '★'.repeat(filled) + '☆'.repeat(Math.max(0, 5 - filled));
}

function getErrorMessage(error: unknown, fallback: string) {
    if (!axios.isAxiosError(error)) return fallback;
    const data = error.response?.data as { message?: string; error?: string } | undefined;
    return data?.message || data?.error || fallback;
}

function AgencyDetailPage({ user }: Props) {
    // 주소창의 /agency/:id 에서 id 를 꺼낸다
    const { id } = useParams();
    const agencyId = Number(id);
    const validAgencyId = Number.isInteger(agencyId) && agencyId > 0;
    const navigate = useNavigate();

    const [agency, setAgency] = useState<AgencyDetail | null>(null);
    const [reviews, setReviews] = useState<AgencyReview[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');

    // 갤러리에서 현재 보고 있는 이미지 번호
    const [imageIndex, setImageIndex] = useState(0);

    // 상담 요청 입력값
    const [searchParams] = useSearchParams();
    const [propertyId, setPropertyId] = useState(() => searchParams.get('propertyId') ?? '');
    const [preferredDate, setPreferredDate] = useState('');
    const [inquiry, setInquiry] = useState('');
    const [agreed, setAgreed] = useState(false);
    const [sending, setSending] = useState(false);

    // 후기 작성
    const [canReview, setCanReview] = useState(false);
    const [rating, setRating] = useState(5);
    const [reviewContent, setReviewContent] = useState('');

    // 토스트 (안내 문구)
    const [toastMessage, setToastMessage] = useState('');
    const [toastVisible, setToastVisible] = useState(false);
    const toastTimer = useRef<number | undefined>(undefined);

    const showToast = (message: string) => {
        setToastMessage(message);
        setToastVisible(true);
        window.clearTimeout(toastTimer.current);
        toastTimer.current = window.setTimeout(() => setToastVisible(false), 2200);
    };

    useEffect(() => () => window.clearTimeout(toastTimer.current), []);

    // 화면에 들어오거나 id 가 바뀌면 사무소 정보와 후기를 불러온다
    useEffect(() => {
        if (!validAgencyId) return;

        const load = async () => {
            setLoading(true);
            setLoadError('');

            try {
                // 두 요청은 서로 기다릴 필요가 없으므로 동시에 보낸다
                const [detail, reviewList] = await Promise.all([
                    getAgencyDetail(agencyId),
                    getAgencyReviews(agencyId),
                ]);

                setAgency(detail);
                setReviews(reviewList);
                setImageIndex(0);
            } catch (error) {
                console.error('중개사무소 상세 조회 실패', error);
                setLoadError('중개사무소 정보를 불러오지 못했습니다.');
            } finally {
                setLoading(false);
            }
        };

        load();
    }, [agencyId, validAgencyId]);

    // 로그인한 사용자라면 후기를 쓸 수 있는지 확인한다 (상담 요청 이력이 있어야 함)
    useEffect(() => {
        if (!user || !validAgencyId) return;

        canWriteReview(agencyId)
            .then(setCanReview)
            .catch((error: unknown) => {
                console.error('후기 작성 가능 여부 조회 실패', error);
                setCanReview(false);
            });
    }, [user, agencyId, validAgencyId]);

    // 상담 요청 보내기
    const handleConsultation = async () => {
        if (!user) {
            showToast('로그인 후 상담을 요청할 수 있습니다.');
            navigate('/member/login');
            return;
        }

        if (!inquiry.trim()) {
            showToast('문의 내용을 입력해 주세요.');
            return;
        }

        // 내 정보가 중개사에게 전달된다는 점을 알리고 동의를 받는다
        if (!agreed) {
            showToast('내 정보 제공에 동의해야 상담을 요청할 수 있습니다.');
            return;
        }

        setSending(true);

        try {
            const message = await requestConsultation(agencyId, {
                propertyId: propertyId ? Number(propertyId) : null,
                preferredDate: preferredDate || null,
                content: inquiry,
                agreed: true,
            });

            showToast(message);

            // 입력값을 비우고, 상담 이력이 생겼으므로 후기 작성 가능 여부를 다시 확인한다
            setInquiry('');
            setPreferredDate('');
            setPropertyId('');
            setAgreed(false);
            setCanReview(await canWriteReview(agencyId));
        } catch (error: unknown) {
            console.error('상담 요청 실패', error);
            showToast(getErrorMessage(error, '상담 요청에 실패했습니다.'));
        } finally {
            setSending(false);
        }
    };

    // 후기 작성
    const handleReview = async () => {
        if (!reviewContent.trim()) {
            showToast('후기 내용을 입력해 주세요.');
            return;
        }

        try {
            const message = await writeReview(agencyId, rating, reviewContent);

            showToast(message);
            setReviewContent('');
            setCanReview(false);

            // 목록과 평점 평균을 새로 받아온다
            setReviews(await getAgencyReviews(agencyId));
            setAgency(await getAgencyDetail(agencyId));
        } catch (error: unknown) {
            console.error('후기 등록 실패', error);
            showToast(getErrorMessage(error, '후기 등록에 실패했습니다.'));
        }
    };

    if (!validAgencyId) {
        return (
            <main><section className="section"><div className="wrap">
                <p style={{ color: 'var(--red)' }}>잘못된 주소입니다.</p>
                <Link className="outline-btn" to="/agency" style={{ marginTop: 14, display: 'inline-block' }}>목록으로 돌아가기</Link>
            </div></section></main>
        );
    }

    if (loading) {
        return (
            <main>
                <section className="section"><div className="wrap"><p className="dim">불러오는 중입니다…</p></div></section>
            </main>
        );
    }

    if (loadError || !agency) {
        return (
            <main>
                <section className="section">
                    <div className="wrap">
                        <p style={{ color: 'var(--red)' }}>{loadError || '중개사무소를 찾을 수 없습니다.'}</p>
                        <Link className="outline-btn" to="/agency" style={{ marginTop: 14, display: 'inline-block' }}>
                            목록으로 돌아가기
                        </Link>
                    </div>
                </section>
            </main>
        );
    }

    return (
        <>
            <main>
                <section className="page-hero">
                    <div className="wrap">
                        <div>
                            <div className="eyebrow">중개사무소 상세</div>
                            <h1>{agency.name}</h1>
                            <p>검증된 자격정보, 영업시간, 상담 상태와 담당 매물을 확인하세요.</p>
                        </div>
                        <div className="hero-stat">
                            <span className="mono dim">담당 매물</span>
                            <strong>{agency.listingCount}건</strong>
                            <span className="xs dim">오늘 신규 {agency.todayNewCount}건</span>
                        </div>
                    </div>
                </section>

                <section className="section">
                    <div className="wrap">
                        <div className="detail-grid">
                            {/*  왼쪽  */}
                            <div className="stack">
                                {/* 사무소 대표 이미지 (갤러리) */}
                                {agency.imageUrls.length > 0 && (
                                    <section className="card" style={{ padding: 0, overflow: 'hidden' }}>
                                        <div
                                            style={{
                                                height: 280,
                                                backgroundImage: `url('${agency.imageUrls[imageIndex]}')`,
                                                backgroundSize: 'cover',
                                                backgroundPosition: 'center',
                                            }}
                                        />
                                        {agency.imageUrls.length > 1 && (
                                            <div className="row" style={{ gap: 8, padding: 12, justifyContent: 'center' }}>
                                                {agency.imageUrls.map((url, index) => (
                                                    <button
                                                        key={url}
                                                        aria-label={`${index + 1}번째 사진 보기`}
                                                        onClick={() => setImageIndex(index)}
                                                        style={{
                                                            width: index === imageIndex ? 22 : 8,
                                                            height: 8,
                                                            borderRadius: 100,
                                                            border: 'none',
                                                            background: index === imageIndex ? 'var(--v)' : 'var(--line)',
                                                            transition: '.2s',
                                                        }}
                                                    />
                                                ))}
                                            </div>
                                        )}
                                    </section>
                                )}

                                {/* 기본 정보 */}
                                <section className="card">
                                    <div className="row between">
                                        <div>
                                            <span className={`status ${STATUS_COLORS[agency.status]}`}>{agency.statusLabel}</span>
                                            <h2 style={{ marginTop: 10 }}>
                                                {agency.name}
                                                {agency.verified && (
                                                    <span className="xs" style={{ marginLeft: 8, color: 'var(--green)' }}>✓ 인증</span>
                                                )}
                                            </h2>
                                            <p className="muted" style={{ marginTop: 6 }}>{agency.address}</p>
                                            {agency.phone && <p className="xs dim" style={{ marginTop: 4 }}>{agency.phone}</p>}
                                        </div>
                                        <div className="avatar" style={{ width: 58, height: 58, fontSize: 18 }}>
                                            {agency.brokerName.charAt(0)}
                                        </div>
                                    </div>

                                    {user && user.role !== 'ADMIN' && (
                                        <div style={{ marginTop: 18 }}>
                                            <Link
                                                className="danger-btn"
                                                to={`/report/form?agencyId=${agency.id}&returnTo=${encodeURIComponent(`/agency/${agency.id}`)}`}
                                            >
                                                중개사무소 신고
                                            </Link>
                                        </div>
                                    )}

                                    <div className="grid-3" style={{ marginTop: 24 }}>
                                        <div className="soft">
                                            <span className="xs dim">대표 공인중개사</span>
                                            <strong style={{ display: 'block', marginTop: 5 }}>{agency.brokerName}</strong>
                                        </div>
                                        <div className="soft">
                                            <span className="xs dim">등록번호</span>
                                            <strong style={{ display: 'block', marginTop: 5 }}>{agency.registrationNo ?? '-'}</strong>
                                        </div>
                                        <div className="soft">
                                            <span className="xs dim">영업시간</span>
                                            <strong style={{ display: 'block', marginTop: 5 }}>{agency.hours ?? '-'}</strong>
                                        </div>
                                    </div>
                                </section>

                                {/* 담당 매물 */}
                                <section className="card">
                                    <div className="row between">
                                        <div>
                                            <h2>담당 매물</h2>
                                            <p className="muted" style={{ marginTop: 6 }}>현재 노출 중인 확인 매물입니다.</p>
                                        </div>
                                        {/* 지도 검색 화면이 생기면 이 중개인 이름으로 검색되도록 넘긴다.
                                            아직 /map 라우트가 없어서 헤더 메뉴와 같은 "준비 중" 안내를 띄운다. */}
                                        <button
                                            className="outline-btn"
                                            onClick={() => navigateOrNotice(
                                                { ...MAP_SEARCH_ITEM, path: `/map?keyword=${encodeURIComponent(agency.address.split(' ')[1] ?? '')}` },
                                                navigate,
                                            )}
                                        >
                                            전체 {agency.listingCount}건
                                        </button>
                                    </div>

                                    {agency.recentProperties.length === 0 ? (
                                        <p className="xs dim" style={{ marginTop: 18 }}>등록된 매물이 없습니다.</p>
                                    ) : (
                                        <div className="grid-2" style={{ marginTop: 18 }}>
                                            {agency.recentProperties.map((property) => (
                                                <Link className="property-row" to={`/property/${property.id}`} key={property.id}>
                                                    <div
                                                        className="thumb"
                                                        style={property.thumbnailUrl
                                                            ? { backgroundImage: `url('${property.thumbnailUrl}')` }
                                                            : undefined}
                                                    />
                                                    <div>
                                                        {/* 지금은 게시중 매물만 조회하지만, 조건이 바뀌어도
                                                            실제 상태가 그대로 보이도록 서버 값을 쓴다 */}
                                                        <span className={`status ${property.status === 'ACTIVE' ? 'green' : 'gray'}`}>
                                                            {property.status === 'ACTIVE' ? '확인 매물' : property.statusLabel}
                                                        </span>
                                                        <h3>{property.priceLabel}</h3>
                                                        <p>{property.dong}{property.area ? ` · ${property.area}` : ''}</p>
                                                    </div>
                                                </Link>
                                            ))}
                                        </div>
                                    )}
                                </section>

                                {/* 위치 지도 */}
                                <section className="card">
                                    <h2>위치</h2>
                                    <p className="muted" style={{ marginTop: 6, marginBottom: 14 }}>{agency.address}</p>
                                    <AgencyMap agencies={[agency]} />
                                </section>

                                {/* 이용자 평가 */}
                                <section className="card">
                                    <div className="row between">
                                        <h2>이용자 평가</h2>
                                        <span className="xs dim">★ {agency.ratingAvg.toFixed(1)} · {agency.reviewCount}건</span>
                                    </div>

                                    {reviews.length === 0 && (
                                        <p className="xs dim" style={{ marginTop: 14 }}>아직 등록된 후기가 없습니다.</p>
                                    )}

                                    {reviews.map((review) => (
                                        <div className="review" key={review.id}>
                                            <div className="row between">
                                                <span className="rating">{toStars(review.rating)}</span>
                                                <div className="row" style={{ gap: 10 }}>
                                                    <span className="xs dim">{review.writerName} · {review.createdAt}</span>
                                                    {user && user.role !== 'ADMIN' && (
                                                        <Link
                                                            className="danger-btn"
                                                            style={{ minHeight: 28, padding: '4px 10px', fontSize: 11 }}
                                                            to={`/report/form?reviewId=${review.id}&returnTo=${encodeURIComponent(`/agency/${agency.id}`)}`}
                                                        >
                                                            리뷰 신고
                                                        </Link>
                                                    )}
                                                </div>
                                            </div>
                                            <p style={{ marginTop: 7 }}>{review.content}</p>

                                            {review.reply && (
                                                <div className="soft" style={{ marginTop: 10 }}>
                                                    <span className="xs dim">중개사무소 답변 · {review.repliedAt}</span>
                                                    <p style={{ marginTop: 5 }}>{review.reply}</p>
                                                </div>
                                            )}
                                        </div>
                                    ))}

                                    {/* 상담 요청을 보낸 적이 있는 사용자만 후기를 쓸 수 있다 */}
                                    {user && canReview ? (
                                        <div style={{ marginTop: 18 }}>
                                            <div className="field">
                                                <label>별점</label>
                                                <select
                                                    className="search-box"
                                                    value={rating}
                                                    onChange={(event) => setRating(Number(event.target.value))}
                                                >
                                                    {[5, 4, 3, 2, 1].map((score) => (
                                                        <option value={score} key={score}>{toStars(score)} ({score}점)</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="field">
                                                <label>한줄 후기</label>
                                                <textarea
                                                    placeholder="상담 경험을 한 줄로 남겨 주세요"
                                                    value={reviewContent}
                                                    onChange={(event) => setReviewContent(event.target.value)}
                                                />
                                            </div>
                                            <button className="solid-btn" onClick={handleReview}>후기 등록</button>
                                        </div>
                                    ) : (
                                        <p className="xs dim" style={{ marginTop: 16 }}>
                                            상담 요청을 보낸 적이 있는 사용자만 후기를 남길 수 있습니다.
                                        </p>
                                    )}
                                </section>
                            </div>

                            {/*  오른쪽  */}
                            <aside className="detail-side stack">
                                <section className="card shadow">
                                    <h3>상담 요청</h3>

                                    <div className="field">
                                        <label>상담 매물 선택</label>
                                        <select
                                            className="search-box"
                                            value={propertyId}
                                            onChange={(event) => setPropertyId(event.target.value)}
                                        >
                                            <option value="">매물을 선택하지 않고 문의</option>
                                            {/* 카드에 보이는 최근 2건이 아니라 담당 매물 전체에서 고를 수 있어야 한다 */}
                                            {agency.properties.map((property) => (
                                                <option value={property.id} key={property.id}>
                                                    {property.name} ({property.priceLabel})
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="field">
                                        <label>상담 희망일</label>
                                        <input
                                            type="date"
                                            value={preferredDate}
                                            onChange={(event) => setPreferredDate(event.target.value)}
                                        />
                                    </div>

                                    <div className="field">
                                        <label>문의 내용</label>
                                        <textarea
                                            placeholder="관심 매물과 질문을 입력하세요"
                                            value={inquiry}
                                            onChange={(event) => setInquiry(event.target.value)}
                                        />
                                    </div>

                                    {/* 내 정보가 중개사에게 전달된다는 안내와 동의 */}
                                    <label className="xs dim" style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'flex-start' }}>
                                        <input
                                            type="checkbox"
                                            checked={agreed}
                                            onChange={(event) => setAgreed(event.target.checked)}
                                            style={{ marginTop: 3 }}
                                        />
                                        <span>
                                            상담 요청을 보내면 내 이름, 연락처가 해당 중개사무소에 전달됩니다. 동의합니다.
                                        </span>
                                    </label>

                                    <button
                                        className="solid-btn"
                                        style={{ width: '100%', marginTop: 14 }}
                                        onClick={handleConsultation}
                                        disabled={sending}
                                    >
                                        {sending ? '전송 중…' : '상담 요청 보내기'}
                                    </button>
                                </section>

                                <section className="soft">
                                    <strong>중개사무소 인증</strong>
                                    <p className="xs dim" style={{ marginTop: 5 }}>
                                        {agency.verified
                                            ? '공인중개사 자격과 사업자 정보를 관리자가 확인한 사무소입니다.'
                                            : '아직 관리자 인증이 완료되지 않은 사무소입니다.'}
                                    </p>
                                </section>
                            </aside>
                        </div>
                    </div>
                </section>
            </main>

            <div className={`toast${toastVisible ? ' show' : ''}`}>{toastMessage}</div>
        </>
    );
}

export default AgencyDetailPage;
