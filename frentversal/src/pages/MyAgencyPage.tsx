import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import {
    getConsultations,
    getDashboard,
    getMyAgency,
    getMyProperties,
    getMyReviews,
    replyToReview,
    updateMyAgency,
} from '../api/myAgencyApi';
import type { AgencyDetail, AgencyReview } from '../types/Agency';
import type { Consultation, MyAgencyDashboard, MyPropertyCard } from '../types/MyAgency';
import AddressInput from './components/AddressInput';
import { CONSULTATION_STATUS_COLORS } from '../utils/consultationStatus';

// 내 중개사무소 페이지 (중개인 전용)
//
// 탭 3개로 구성한다.
//   요약      : 등록 매물(2행 3열, 페이징) + 상담 내역 + 평균 평점
//   사무소 정보 : 중개사무소 상세와 같은 내용을 보여 주고, 하단 "수정" 버튼으로 수정 모드 전환
//   리뷰 관리   : 전체 평점 / 미답변 수 / 필터 / 리뷰 목록(10개씩 페이징) + 답변 달기
//
// 주소에 ?tab=reviews 나 ?mode=edit 를 붙여서 들어오면 해당 탭·모드로 바로 열린다.
// (헤더 알림에서 리뷰 알림을 누르면 ?tab=reviews 로 들어온다)

type TabKey = 'summary' | 'info' | 'reviews';

const TABS: { key: TabKey; label: string }[] = [
    { key: 'summary', label: '요약' },
    { key: 'info', label: '사무소 정보' },
    { key: 'reviews', label: '리뷰 관리' },
];

// 리뷰 필터 (서버의 filter 파라미터 값과 같아야 한다)
const REVIEW_FILTERS = [
    { value: 'ALL', label: '전체' },
    { value: 'UNANSWERED', label: '미답변만 보기' },
    { value: 'ANSWERED', label: '답변 완료' },
];

// 별점 숫자를 ★★★★☆ 로 바꾼다
function toStars(rating: number) {
    const filled = Math.round(rating);

    return '★'.repeat(filled) + '☆'.repeat(Math.max(0, 5 - filled));
}

function MyAgencyPage() {
    const [searchParams] = useSearchParams();

    // 주소의 ?tab= 값으로 처음 열 탭을 정한다
    const initialTab = (searchParams.get('tab') as TabKey) ?? 'summary';
    const [tab, setTab] = useState<TabKey>(TABS.some((item) => item.key === initialTab) ? initialTab : 'summary');

    const [agency, setAgency] = useState<AgencyDetail | null>(null);
    const [dashboard, setDashboard] = useState<MyAgencyDashboard | null>(null);
    const [loadError, setLoadError] = useState('');
    const [message, setMessage] = useState('');

    // 등록 매물 (한 페이지 6개)
    const [properties, setProperties] = useState<MyPropertyCard[]>([]);
    const [propertyPage, setPropertyPage] = useState(0);
    const [propertyTotalPages, setPropertyTotalPages] = useState(0);

    // 상담 내역
    const [consultations, setConsultations] = useState<Consultation[]>([]);

    // 리뷰 (한 페이지 10개)
    const [reviews, setReviews] = useState<AgencyReview[]>([]);
    const [reviewFilter, setReviewFilter] = useState('ALL');
    const [reviewPage, setReviewPage] = useState(0);
    const [reviewTotalPages, setReviewTotalPages] = useState(0);
    const [replyTarget, setReplyTarget] = useState<number | null>(null); // 지금 답변을 쓰고 있는 리뷰 id
    const [replyText, setReplyText] = useState('');

    // 사무소 정보 수정 모드
    const [editMode, setEditMode] = useState(searchParams.get('mode') === 'edit');
    const [form, setForm] = useState<Partial<AgencyDetail>>({});

    // 상세주소(층·호수). 주소를 한 덩어리로 저장하므로 저장할 때 뒤에 합친다.
    const [addressDetail, setAddressDetail] = useState('');

    // 사무소 정보와 대시보드는 처음 한 번만 불러온다
    useEffect(() => {
        const load = async () => {
            try {
                const [agencyData, dashboardData] = await Promise.all([getMyAgency(), getDashboard()]);

                setAgency(agencyData);
                setForm(agencyData);
                setDashboard(dashboardData);
            } catch (error: any) {
                setLoadError(error.response?.data?.message ?? '중개사무소 정보를 불러오지 못했습니다.');
            }
        };

        load();
    }, []);

    // 등록 매물 : 페이지가 바뀔 때마다 다시 불러온다
    useEffect(() => {
        getMyProperties(propertyPage)
            .then((data) => {
                setProperties(data.content);
                setPropertyTotalPages(data.totalPages);
            })
            .catch(() => setProperties([]));
    }, [propertyPage]);

    // 상담 내역 (요약 탭에서 최근 것부터 보여 준다)
    useEffect(() => {
        getConsultations('ALL')
            .then(setConsultations)
            .catch(() => setConsultations([]));
    }, []);

    // 리뷰 : 필터나 페이지가 바뀌면 다시 불러온다
    useEffect(() => {
        getMyReviews(reviewFilter, reviewPage)
            .then((data) => {
                setReviews(data.content);
                setReviewTotalPages(data.totalPages);
            })
            .catch(() => setReviews([]));
    }, [reviewFilter, reviewPage]);

    // 사무소 정보 저장
    const handleSave = async () => {
        try {
            // 상세주소는 따로 저장할 칸이 없어서 도로명 주소 뒤에 붙여 보낸다
            const address = [form.address, addressDetail].filter(Boolean).join(' ');

            setMessage(await updateMyAgency({ ...form, address }));
            setAgency(await getMyAgency());
            setEditMode(false);
        } catch (error: any) {
            setMessage(error.response?.data?.message ?? '저장에 실패했습니다.');
        }
    };

    // 리뷰 답변 저장
    const handleReviewReply = async (reviewId: number) => {
        if (!replyText.trim()) {
            setMessage('답변 내용을 입력해 주세요.');
            return;
        }

        try {
            setMessage(await replyToReview(reviewId, replyText));
            setReplyTarget(null);
            setReplyText('');

            // 목록과 미답변 개수를 새로 받아온다
            const data = await getMyReviews(reviewFilter, reviewPage);
            setReviews(data.content);
            setReviewTotalPages(data.totalPages);
            setDashboard(await getDashboard());
        } catch (error: any) {
            setMessage(error.response?.data?.message ?? '답변 등록에 실패했습니다.');
        }
    };

    if (loadError) {
        return (
            <main>
                <section className="section"><div className="wrap">
                    <p style={{ color: 'var(--red)' }}>{loadError}</p>
                    <Link className="solid-btn" to="/broker/verification" style={{ marginTop: 14, display: 'inline-block' }}>
                        중개사무소 인증 받기
                    </Link>
                </div></section>
            </main>
        );
    }

    if (!agency) {
        return <main><section className="section"><div className="wrap"><p className="dim">불러오는 중입니다…</p></div></section></main>;
    }

    return (
        <main>
            <section className="page-hero">
                <div className="wrap">
                    <div>
                        <div className="eyebrow">내 중개사무소</div>
                        <h1>{agency.name}</h1>
                        <p>내가 등록한 매물과 상담 내역, 이용자 평가를 관리합니다.</p>
                    </div>
                    <div className="hero-stat">
                        <span className="mono dim">평균 평점</span>
                        <strong>★ {(dashboard?.ratingAvg ?? agency.ratingAvg).toFixed(1)}</strong>
                        <span className="xs dim">리뷰 {dashboard?.reviewCount ?? agency.reviewCount}건</span>
                    </div>
                </div>
            </section>

            <section className="section">
                <div className="wrap">
                    {/*  탭  */}
                    <div className="tabs">
                        {TABS.map((item) => (
                            <button
                                className={`tab-btn${tab === item.key ? ' on' : ''}`}
                                onClick={() => setTab(item.key)}
                                key={item.key}
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>

                    {message && <p className="xs" style={{ marginBottom: 16, color: 'var(--v)' }}>{message}</p>}

                    {/*  요약 탭  */}
                    {tab === 'summary' && (
                        <>
                            <div className="section-head">
                                <div>
                                    <h2>등록 매물</h2>
                                    <p>내가 등록한 매물입니다. 승인 대기, 비공개 매물도 함께 보입니다.</p>
                                </div>
                                <Link className="outline-btn" to="/property/form">매물 등록</Link>
                            </div>

                            {properties.length === 0 ? (
                                <p className="xs dim">등록한 매물이 없습니다.</p>
                            ) : (
                                <div className="grid-3">
                                    {properties.map((property) => (
                                        <Link className="card" to={`/property/${property.id}`} key={property.id}>
                                            <div
                                                className="thumb"
                                                style={{
                                                    height: 120,
                                                    marginBottom: 12,
                                                    ...(property.thumbnailUrl
                                                        ? { backgroundImage: `url('${property.thumbnailUrl}')` }
                                                        : {}),
                                                }}
                                            />

                                            <div className="row between">
                                                <span className={`status ${property.status === 'ACTIVE' ? 'green'
                                                    : property.status === 'PENDING' ? 'orange' : 'gray'}`}>
                                                    {property.statusLabel}
                                                </span>
                                                {!property.visible && <span className="status gray">비공개</span>}
                                            </div>

                                            <h3 style={{ marginTop: 10 }}>{property.name}</h3>
                                            <p className="xs dim" style={{ marginTop: 6 }}>
                                                {property.typeLabel} · {property.priceLabel}
                                            </p>
                                            <p className="xs dim" style={{ marginTop: 4 }}>
                                                {property.address}
                                            </p>
                                            <p className="xs dim" style={{ marginTop: 4 }}>
                                                {property.area ?? '-'}
                                                {property.floor != null ? ` · ${property.floor}층` : ''}
                                            </p>

                                            <div className="divider" style={{ margin: '12px 0' }}></div>
                                            <span className="xs dim">등록일 {property.createdAt}</span>
                                        </Link>
                                    ))}
                                </div>
                            )}

                            {/* 매물 페이징 */}
                            {propertyTotalPages > 1 && (
                                <div className="row" style={{ gap: 6, marginTop: 18, justifyContent: 'center' }}>
                                    {Array.from({ length: propertyTotalPages }, (_, index) => (
                                        <button
                                            className={`tab-btn${propertyPage === index ? ' on' : ''}`}
                                            onClick={() => setPropertyPage(index)}
                                            key={index}
                                        >
                                            {index + 1}
                                        </button>
                                    ))}
                                </div>
                            )}

                            <div className="section-head" style={{ marginTop: 48 }}>
                                <div>
                                    <h2>상담 내역</h2>
                                    <p>확인 후 직접 문자나 전화로 연락해 주세요. 사이트에서 제공하는 연결 기능은 없습니다.</p>
                                </div>
                            </div>

                            {consultations.length === 0 ? (
                                <p className="xs dim">들어온 상담 요청이 없습니다.</p>
                            ) : (
                                <div className="stack">
                                    {consultations.map((consultation) => (
                                        <Link className="card" to={`/broker/consultations/${consultation.id}`} key={consultation.id}>
                                            <div className="row between">
                                                <span className={`status ${CONSULTATION_STATUS_COLORS[consultation.status]}`}>
                                                    {consultation.statusLabel}
                                                </span>
                                                <span className="xs dim">{consultation.createdAt}</span>
                                            </div>
                                            <h3 style={{ marginTop: 10 }}>{consultation.memberName ?? '이용자'} 님</h3>
                                            <p className="xs dim" style={{ marginTop: 6 }}>
                                                {consultation.memberPhone ?? '연락처 없음'} · 희망일 {consultation.preferredDate ?? '미지정'}
                                            </p>
                                            <p className="xs dim" style={{ marginTop: 6 }}>{consultation.content}</p>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </>
                    )}

                    {/*  사무소 정보 탭  */}
                    {tab === 'info' && (
                        <section className="card">
                            <div className="row between">
                                <h2>사무소 정보</h2>
                                <span className={`status ${agency.verified ? 'green' : 'gray'}`}>
                                    {agency.verified ? '인증 완료' : '미인증'}
                                </span>
                            </div>

                            {!editMode ? (
                                <>
                                    {/* 보기 모드 : 중개사무소 상세 페이지와 같은 정보를 노출한다 */}
                                    <div className="grid-3" style={{ marginTop: 22 }}>
                                        <div className="soft">
                                            <span className="xs dim">사무소 이름</span>
                                            <strong style={{ display: 'block', marginTop: 5 }}>{agency.name}</strong>
                                        </div>
                                        <div className="soft">
                                            <span className="xs dim">대표 공인중개사</span>
                                            <strong style={{ display: 'block', marginTop: 5 }}>{agency.brokerName}</strong>
                                        </div>
                                        <div className="soft">
                                            <span className="xs dim">등록번호</span>
                                            <strong style={{ display: 'block', marginTop: 5 }}>{agency.registrationNo ?? '-'}</strong>
                                        </div>
                                        <div className="soft">
                                            <span className="xs dim">주소</span>
                                            <strong style={{ display: 'block', marginTop: 5 }}>{agency.address}</strong>
                                        </div>
                                        <div className="soft">
                                            <span className="xs dim">전화번호</span>
                                            <strong style={{ display: 'block', marginTop: 5 }}>{agency.phone ?? '-'}</strong>
                                        </div>
                                        <div className="soft">
                                            <span className="xs dim">영업시간</span>
                                            <strong style={{ display: 'block', marginTop: 5 }}>{agency.hours ?? '-'}</strong>
                                        </div>
                                        <div className="soft">
                                            <span className="xs dim">상담 상태</span>
                                            <strong style={{ display: 'block', marginTop: 5 }}>{agency.statusLabel}</strong>
                                        </div>
                                        <div className="soft">
                                            <span className="xs dim">담당 매물</span>
                                            <strong style={{ display: 'block', marginTop: 5 }}>{agency.listingCount}건</strong>
                                        </div>
                                        <div className="soft">
                                            <span className="xs dim">평균 평점</span>
                                            <strong style={{ display: 'block', marginTop: 5 }}>★ {agency.ratingAvg.toFixed(1)}</strong>
                                        </div>
                                    </div>

                                    {/* 탭 최하단의 수정 버튼 : 누르면 수정 모드로 바뀐다 */}
                                    <button className="solid-btn" style={{ marginTop: 22 }} onClick={() => setEditMode(true)}>
                                        수정
                                    </button>
                                </>
                            ) : (
                                <>
                                    {/* 수정 모드 */}
                                    <div className="field">
                                        <label>사무소 이름</label>
                                        <input
                                            value={form.name ?? ''}
                                            onChange={(event) => setForm({ ...form, name: event.target.value })}
                                        />
                                    </div>
                                    <div className="field">
                                        <label>대표 공인중개사</label>
                                        <input
                                            value={form.brokerName ?? ''}
                                            onChange={(event) => setForm({ ...form, brokerName: event.target.value })}
                                        />
                                    </div>
                                    <div className="field">
                                        <label>등록번호</label>
                                        <input
                                            value={form.registrationNo ?? ''}
                                            onChange={(event) => setForm({ ...form, registrationNo: event.target.value })}
                                        />
                                    </div>
                                    {/* 주소를 바꾸면 서버가 좌표를 다시 찾아 지도에 반영한다.
                                        검색해서 고른 도로명 주소만 들어가게 한다. */}
                                    <AddressInput
                                        value={form.address ?? ''}
                                        detail={addressDetail}
                                        onChange={({ address, detail, selected }) => {
                                            // 주소를 새로 고르면 구·동도 함께 갱신한다
                                            setForm(selected
                                                ? { ...form, address, sigungu: selected.sigungu, dong: selected.dong }
                                                : { ...form, address });
                                            setAddressDetail(detail);
                                        }}
                                    />
                                    <div className="field">
                                        <label>전화번호</label>
                                        <input
                                            value={form.phone ?? ''}
                                            onChange={(event) => setForm({ ...form, phone: event.target.value })}
                                        />
                                    </div>
                                    <div className="field">
                                        <label>영업시간</label>
                                        <input
                                            placeholder="09:00-19:00"
                                            value={form.hours ?? ''}
                                            onChange={(event) => setForm({ ...form, hours: event.target.value })}
                                        />
                                    </div>
                                    <div className="field">
                                        <label>상담 상태</label>
                                        <select
                                            value={form.status ?? 'AVAILABLE'}
                                            onChange={(event) => setForm({ ...form, status: event.target.value as AgencyDetail['status'] })}
                                        >
                                            <option value="AVAILABLE">상담 가능</option>
                                            <option value="RESERVED">예약 상담</option>
                                            <option value="CLOSED">상담 불가</option>
                                        </select>
                                    </div>

                                    <div className="row" style={{ gap: 10, marginTop: 20 }}>
                                        <button className="solid-btn" onClick={handleSave}>저장</button>
                                        <button className="outline-btn" onClick={() => { setEditMode(false); setForm(agency); }}>
                                            취소
                                        </button>
                                    </div>
                                </>
                            )}
                        </section>
                    )}

                    {/*  리뷰 관리 탭  */}
                    {tab === 'reviews' && (
                        <>
                            <div className="grid-2">
                                <div className="card">
                                    <span className="xs dim">전체 평점</span>
                                    <strong className="num" style={{ display: 'block', marginTop: 6, fontSize: 26 }}>
                                        ★ {(dashboard?.ratingAvg ?? 0).toFixed(1)}
                                    </strong>
                                    <span className="xs dim">리뷰 {dashboard?.reviewCount ?? 0}건</span>
                                </div>
                                <div className="card">
                                    <span className="xs dim">미답변 리뷰</span>
                                    <strong className="num" style={{ display: 'block', marginTop: 6, fontSize: 26 }}>
                                        {dashboard?.unansweredReviewCount ?? 0}건
                                    </strong>
                                    <span className="xs dim">답변을 기다리는 리뷰입니다.</span>
                                </div>
                            </div>

                            <div className="section-head" style={{ marginTop: 32 }}>
                                <div>
                                    <h2>리뷰 목록</h2>
                                    <p>한 페이지에 10개씩 표시됩니다.</p>
                                </div>
                                <select
                                    className="search-box"
                                    style={{ maxWidth: 200 }}
                                    value={reviewFilter}
                                    onChange={(event) => { setReviewFilter(event.target.value); setReviewPage(0); }}
                                >
                                    {REVIEW_FILTERS.map((item) => (
                                        <option value={item.value} key={item.value}>{item.label}</option>
                                    ))}
                                </select>
                            </div>

                            {reviews.length === 0 ? (
                                <p className="xs dim">해당 조건의 리뷰가 없습니다.</p>
                            ) : (
                                reviews.map((review) => (
                                    <div className="card" style={{ marginBottom: 14 }} key={review.id}>
                                        <div className="row between">
                                            <span className="rating">{toStars(review.rating)}</span>
                                            <span className="xs dim">{review.writerName} · {review.createdAt}</span>
                                        </div>
                                        <p style={{ marginTop: 8 }}>{review.content}</p>

                                        {review.reply ? (
                                            <div className="soft" style={{ marginTop: 12 }}>
                                                <span className="xs dim">내 답변 · {review.repliedAt}</span>
                                                <p style={{ marginTop: 5 }}>{review.reply}</p>
                                            </div>
                                        ) : replyTarget === review.id ? (
                                            <div style={{ marginTop: 12 }}>
                                                <div className="field">
                                                    <label>답변 내용</label>
                                                    <textarea
                                                        value={replyText}
                                                        onChange={(event) => setReplyText(event.target.value)}
                                                        placeholder="이용자에게 전할 답변을 입력하세요"
                                                    />
                                                </div>
                                                <div className="row" style={{ gap: 10, marginTop: 10 }}>
                                                    <button className="solid-btn" onClick={() => handleReviewReply(review.id)}>
                                                        답변 등록
                                                    </button>
                                                    <button className="outline-btn" onClick={() => setReplyTarget(null)}>취소</button>
                                                </div>
                                            </div>
                                        ) : (
                                            <button
                                                className="outline-btn"
                                                style={{ marginTop: 12 }}
                                                onClick={() => { setReplyTarget(review.id); setReplyText(''); }}
                                            >
                                                답변하기
                                            </button>
                                        )}
                                    </div>
                                ))
                            )}

                            {/* 리뷰 페이징 */}
                            {reviewTotalPages > 1 && (
                                <div className="row" style={{ gap: 6, marginTop: 18, justifyContent: 'center' }}>
                                    {Array.from({ length: reviewTotalPages }, (_, index) => (
                                        <button
                                            className={`tab-btn${reviewPage === index ? ' on' : ''}`}
                                            onClick={() => setReviewPage(index)}
                                            key={index}
                                        >
                                            {index + 1}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </section>
        </main>
    );
}

export default MyAgencyPage;
