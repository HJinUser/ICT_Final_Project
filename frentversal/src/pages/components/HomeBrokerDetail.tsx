/*
  메인 홈페이지 - 중개인 상세 블록 (공통 콘텐츠 뒤, 맨 아래 CTA 앞).

  요약 스트립(HomeBrokerSummary)이 "몇 건인지"를 보여 준다면
  이 블록은 "그래서 무엇을 처리해야 하는지"를 목록으로 보여 준다.

  아래 두 칸(매물 반응 추이 · 머신러닝 평가)은 GET /my-agency/insights 한 번으로 함께 받는다.

  화면정의서에는 반응 추이가 "월별 조회수"로 적혀 있지만, 매물 상세를 몇 번 열었는지는
  서버가 남기지 않는다(조회수 컬럼도, 열람 기록 테이블도 없다). 대신 사용자가 매물에 남긴
  행동에는 시각이 함께 저장돼 있어서, 관심 등록·추천 평가·상담 요청 셋을 합쳐 "반응"으로 보여 준다.
*/

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { getConsultations, getInsights, getMyProperties } from '../../api/myAgencyApi';
import type { Consultation, MyAgencyInsights, MyPropertyCard } from '../../types/MyAgency';

// 메인에 걸어 둘 개수. 전체는 각 관리 화면에서 본다.
const PROPERTY_COUNT = 5;
const CONSULTATION_COUNT = 2;

// 반응 추이 막대의 높이(px). 여기를 바꾸면 CSS 의 .home-trend-bar 높이도 함께 바꾼다.
const TREND_BAR_HEIGHT = 96;

function HomeBrokerDetail() {
    const navigate = useNavigate();

    const [properties, setProperties] = useState<MyPropertyCard[]>([]);
    const [propertyTotal, setPropertyTotal] = useState(0);
    const [propertyError, setPropertyError] = useState('');

    const [consultations, setConsultations] = useState<Consultation[]>([]);
    const [consultationError, setConsultationError] = useState('');

    const [insights, setInsights] = useState<MyAgencyInsights | null>(null);
    const [insightsError, setInsightsError] = useState('');

    useEffect(() => {
        getMyProperties(0)
            .then((result) => {
                setProperties(result.content.slice(0, PROPERTY_COUNT));
                setPropertyTotal(result.totalCount);
                setPropertyError('');
            })
            .catch((err) => {
                console.error('내 매물 목록을 불러오지 못했습니다.', err);
                setProperties([]);
                setPropertyError('매물 목록을 불러오지 못했습니다.');
            });

        // 아직 답변하지 않은 상담만 본다
        getConsultations('REQUESTED')
            .then((result) => {
                setConsultations(result.slice(0, CONSULTATION_COUNT));
                setConsultationError('');
            })
            .catch((err) => {
                console.error('상담 요청을 불러오지 못했습니다.', err);
                setConsultations([]);
                setConsultationError('상담 요청을 불러오지 못했습니다.');
            });

        // 반응 추이와 머신러닝 평가는 한 번에 받는다
        getInsights()
            .then((result) => {
                setInsights(result);
                setInsightsError('');
            })
            .catch((err) => {
                console.error('매물 반응·평가 자료를 불러오지 못했습니다.', err);
                setInsights(null);
                // 사무소를 아직 만들지 않은 중개인은 404 가 온다. 그 경우도 같은 문구로 안내한다.
                setInsightsError('매물 반응·평가 자료를 불러오지 못했습니다.');
            });
    }, []);

    // 막대 높이를 정할 기준값. 반응이 하나도 없어도 0 으로 나누지 않도록 최소 1 로 둔다.
    const trendMax = Math.max(1, ...(insights?.trend.map((item) => item.total) ?? [0]));

    // 범례에 쓸 기간 전체 합계
    const favoriteSum = insights?.trend.reduce((sum, item) => sum + item.favoriteCount, 0) ?? 0;
    const feedbackSum = insights?.trend.reduce((sum, item) => sum + item.feedbackCount, 0) ?? 0;
    const consultationSum = insights?.trend.reduce((sum, item) => sum + item.consultationCount, 0) ?? 0;

    // 막대 한 칸의 높이(px). 값이 0 이면 아예 그리지 않는다.
    const segmentHeight = (count: number) => (count === 0 ? 0 : (count / trendMax) * TREND_BAR_HEIGHT);

    /*
      바로 위 HomeBrokerSummary(오늘 매물 현황)는 흰 배경이다. 여기를 같은 흰색으로 맞추면
      두 구역이 한 덩어리로 붙어 보여서 "오늘 현황"과 "처리할 목록"이 구분되지 않는다.
      alt(회색)를 그대로 써서 Summary 와 이 구역이 서로 다른 배경으로 나뉘어 보이게 한다.
      (다음에 오는 공지사항 구역도 회색이라 그쪽 경계는 약해지지만, 각 구역에 제목·카드가
      뚜렷해서 헷갈리지 않는다. 이쪽 경계가 더 자주 눈에 띄는 자리라 이쪽을 우선한다.)
    */
    return (
        <section className="home-sec alt">
            <div className="rv-wrap">
                <div className="home-shead">
                    <div>
                        <h2>처리할 내 매물</h2>
                        <p>최근에 올린 매물과 아직 답변하지 않은 상담입니다.</p>
                    </div>
                    <button className="home-more" onClick={() => navigate('/broker/properties')}>
                        매물 전체 {propertyTotal}건 보기
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                            <path d="M5 12h13M12 5l7 7-7 7" />
                        </svg>
                    </button>
                </div>

                <div className="home-two">
                    {/* 최근 등록한 매물 */}
                    <div className="card">
                        <div className="row between" style={{ alignItems: 'baseline' }}>
                            <h3 style={{ fontSize: 17 }}>최근 등록한 매물</h3>
                            <span className="rv-xs rv-dim">최신순 {PROPERTY_COUNT}건</span>
                        </div>

                        {propertyError && (
                            <p className="xs" style={{ marginTop: 14, color: 'var(--sig-high)' }}>{propertyError}</p>
                        )}

                        {!propertyError && properties.length === 0 && (
                            <p className="xs dim" style={{ marginTop: 14 }}>아직 등록한 매물이 없습니다.</p>
                        )}

                        {properties.length > 0 && (
                            <ul className="home-minilist">
                                {properties.map((property) => (
                                    <li key={property.id}>
                                        <button onClick={() => navigate(`/property/${property.id}`)}>
                                            <span className="ttl">{property.name}</span>
                                            <span className="sub">{property.priceLabel}</span>
                                            <span className="status gray">{property.statusLabel}</span>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    {/* 답변을 기다리는 상담 */}
                    <div className="card">
                        <div className="row between" style={{ alignItems: 'baseline' }}>
                            <h3 style={{ fontSize: 17 }}>답변을 기다리는 상담</h3>
                            <button
                                onClick={() => navigate('/broker/mypage')}
                                style={{ fontSize: 13, color: 'var(--v)' }}
                            >
                                전체 보기
                            </button>
                        </div>

                        {consultationError && (
                            <p className="xs" style={{ marginTop: 14, color: 'var(--sig-high)' }}>{consultationError}</p>
                        )}

                        {!consultationError && consultations.length === 0 && (
                            <p className="xs dim" style={{ marginTop: 14 }}>답변을 기다리는 상담이 없습니다.</p>
                        )}

                        {consultations.length > 0 && (
                            <ul className="home-minilist">
                                {consultations.map((consultation) => (
                                    <li key={consultation.id}>
                                        <button onClick={() => navigate(`/broker/consultations/${consultation.id}`)}>
                                            <span className="ttl">
                                                {consultation.memberName ?? '이름 없음'} · {consultation.content}
                                            </span>
                                            <span className="rv-xs rv-dim sub">{consultation.createdAt}</span>
                                            <span className="status orange">{consultation.statusLabel}</span>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>

                <div className="home-two" style={{ marginTop: 18 }}>
                    {/* 매물 반응 추이 */}
                    <div className="card">
                        <div className="row between" style={{ alignItems: 'baseline' }}>
                            <h3 style={{ fontSize: 17 }}>매물 반응 추이</h3>
                            <span className="rv-xs rv-dim">
                                최근 {insights?.trendMonths ?? 6}개월 · {insights?.trendTotal ?? 0}건
                            </span>
                        </div>

                        {insightsError && (
                            <p className="xs" style={{ marginTop: 14, color: 'var(--sig-high)' }}>{insightsError}</p>
                        )}

                        {!insightsError && !insights && (
                            <p className="xs dim" style={{ marginTop: 14 }}>불러오는 중입니다…</p>
                        )}

                        {insights && (
                            <>
                                <div className="home-trend">
                                    {insights.trend.map((item) => (
                                        <div className="home-trend-col" key={item.month}>
                                            <span className="home-trend-total">{item.total}</span>

                                            <div
                                                className="home-trend-bar"
                                                title={`${item.label} · 관심 ${item.favoriteCount} · 평가 ${item.feedbackCount} · 상담 ${item.consultationCount}`}
                                            >
                                                <span
                                                    className="seg favorite"
                                                    style={{ height: segmentHeight(item.favoriteCount) }}
                                                />
                                                <span
                                                    className="seg feedback"
                                                    style={{ height: segmentHeight(item.feedbackCount) }}
                                                />
                                                <span
                                                    className="seg consultation"
                                                    style={{ height: segmentHeight(item.consultationCount) }}
                                                />
                                            </div>

                                            <span className="home-trend-label">{item.label}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="home-trend-legend">
                                    <span><i className="favorite" />관심 등록 <strong>{favoriteSum}</strong></span>
                                    <span><i className="feedback" />추천 평가 <strong>{feedbackSum}</strong></span>
                                    <span><i className="consultation" />상담 요청 <strong>{consultationSum}</strong></span>
                                </div>

                                <p className="xs dim" style={{ marginTop: 10 }}>
                                    매물 상세를 몇 번 열었는지는 따로 기록하지 않아, 사용자가 실제로 남긴
                                    관심·평가·상담을 합쳐 보여 드립니다.
                                </p>
                            </>
                        )}
                    </div>

                    {/* 머신러닝 평가 */}
                    <div className="card">
                        <div className="row between" style={{ alignItems: 'baseline' }}>
                            <h3 style={{ fontSize: 17 }}>머신러닝 평가</h3>
                            <span className="rv-xs rv-dim">
                                추천 평가 {insights?.feedbackTotal ?? 0}건
                            </span>
                        </div>

                        {insightsError && (
                            <p className="xs" style={{ marginTop: 14, color: 'var(--sig-high)' }}>{insightsError}</p>
                        )}

                        {!insightsError && !insights && (
                            <p className="xs dim" style={{ marginTop: 14 }}>불러오는 중입니다…</p>
                        )}

                        {insights && insights.feedbackTotal === 0 && (
                            <p className="xs dim" style={{ marginTop: 14 }}>
                                아직 내 매물에 남은 추천 평가가 없습니다. 평가가 쌓이면 좋아요·싫어요 비중을 보여 드립니다.
                            </p>
                        )}

                        {insights && insights.feedbackTotal > 0 && (
                            <>
                                <div className="home-ratio">
                                    <span
                                        className="like"
                                        style={{ width: `${insights.likeRatio}%` }}
                                    />
                                </div>

                                <div className="home-ratio-legend">
                                    <span>좋아요 <strong>{insights.likeCount}</strong> · {insights.likeRatio}%</span>
                                    <span>싫어요 <strong>{insights.dislikeCount}</strong></span>
                                </div>

                                {insights.dislikedProperties.length > 0 && (
                                    <>
                                        <p className="home-sub-title">호가를 다시 볼 매물</p>

                                        <ul className="home-minilist">
                                            {insights.dislikedProperties.map((item) => (
                                                <li key={item.propertyId}>
                                                    <button onClick={() => navigate(`/property/${item.propertyId}`)}>
                                                        <span className="ttl">
                                                            {item.name}
                                                            {item.suggestedPriceLabel && (
                                                                <em className="home-price-hint">
                                                                    {item.priceLabel} → 권장 {item.suggestedPriceLabel}
                                                                    {item.gapPercent != null && item.gapPercent > 0
                                                                        ? ` (예상보다 ${item.gapPercent}% 높음)`
                                                                        : ''}
                                                                </em>
                                                            )}
                                                        </span>
                                                        <span className="status red">
                                                            싫어요 {item.dislikeRatio}%
                                                        </span>
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    </>
                                )}
                            </>
                        )}

                        {insights && insights.staleProperties.length > 0 && (
                            <>
                                <p className="home-sub-title">오래 남아 있는 매물</p>

                                <ul className="home-minilist">
                                    {insights.staleProperties.map((item) => (
                                        <li key={item.propertyId}>
                                            <button onClick={() => navigate(`/property/${item.propertyId}`)}>
                                                <span className="ttl">
                                                    {item.name}
                                                    <em className="home-price-hint">
                                                        {item.priceLabel} · 관심 {item.favoriteCount} · 싫어요 {item.dislikeCount}
                                                    </em>
                                                </span>
                                                <span className="status orange">{item.daysOnMarket}일째</span>
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}

export default HomeBrokerDetail;
