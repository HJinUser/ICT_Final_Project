/*
  메인 홈페이지 - 중개인 상세 블록 (공통 콘텐츠 뒤, 맨 아래 CTA 앞).

  요약 스트립(HomeBrokerSummary)이 "몇 건인지"를 보여 준다면
  이 블록은 "그래서 무엇을 처리해야 하는지"를 목록으로 보여 준다.

  화면정의서의 "오래 남은 매물"과 "머신러닝 평가(좋아요/싫어요 비중)"는
  서버에 해당 조회가 아직 없어서 자리만 잡아 두고 준비 중으로 표시한다.
  (매물 목록 API는 최신 등록순 6건 단위 페이징만 지원한다.)
*/

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { getConsultations, getMyProperties } from '../api/myAgencyApi';
import type { Consultation, MyPropertyCard } from '../types/MyAgency';

// 메인에 걸어 둘 개수. 전체는 각 관리 화면에서 본다.
const PROPERTY_COUNT = 5;
const CONSULTATION_COUNT = 2;

function HomeBrokerDetail() {
    const navigate = useNavigate();

    const [properties, setProperties] = useState<MyPropertyCard[]>([]);
    const [propertyTotal, setPropertyTotal] = useState(0);
    const [propertyError, setPropertyError] = useState('');

    const [consultations, setConsultations] = useState<Consultation[]>([]);
    const [consultationError, setConsultationError] = useState('');

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
    }, []);

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

                {/* 서버 조회가 아직 없는 항목. 자리만 잡아 둔다. */}
                <div className="home-two" style={{ marginTop: 18 }}>
                    <div className="home-prep">
                        <span className="badge">준비 중</span>
                        <strong>매물 조회 추이</strong>
                        <p>등록한 매물의 월별 조회수를 선 그래프로 보여드릴 예정입니다.</p>
                    </div>

                    <div className="home-prep">
                        <span className="badge">준비 중</span>
                        <strong>머신러닝 평가</strong>
                        <p>
                            싫어요 비중이 높은 매물의 공통점과 권장 호가, 오래 남아 있는 매물을
                            분석해 보여드릴 예정입니다.
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
}

export default HomeBrokerDetail;
