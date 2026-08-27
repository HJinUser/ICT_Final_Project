/*
  동네 상세.

  법정동 정보(관리자가 등록한 설명·태그·매물 수)와 행정동 AI 분석(K-Means 군집·지도·한줄평)을
  한 화면에 합쳐서 보여준다.

  둘은 원래 코드 체계가 다르다 — 이 페이지의 Neighborhood.id는 법정동, AI 분석은 행정동이다.
  법정동 하나가 행정동 여러 개에 걸치는 경우(전체의 약 30%)가 있어서 완벽한 1:1은 아니지만,
  서버가 매핑표로 대표 행정동 하나를 찾아 준다. 매핑이 없는 동네는 AI 영역만 비운다.

  이전에는 이 화면과 별개로 /neighborhood/ml/:adminCode 가 있어서, 사용자 입장에서
  "동네 상세가 왜 두 개냐"는 혼란이 있었다. 그 화면은 맞춤 추천에서 adminCode만 들고
  넘어오는 경로(법정동 매물이 없는 행정동 포함)에 계속 쓰이므로 남겨 두고,
  여기서는 그 화면의 AI 콘텐츠(군집·지도·한줄평)를 그대로 가져와 붙인다.
*/

import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { getMlAnalysisForNeighborhood, getNeighborhood } from '../api/neighborhoodApi';
import type { NeighborhoodResponse } from '../types/Neighborhood';
import type { MlNeighborhoodResponse } from '../types/MlNeighborhood';
import MlNeighborhoodMap from './components/MlNeighborhoodMap';
import NeighborhoodReviewSection from './components/NeighborhoodReviewSection';
import '../styles/NeighborhoodDetailPage.css';

function formatJeonsePrice(price: number) {
    if (price <= 0) return '정보 없음';
    const eok = Math.floor(price / 10_000);
    const remainder = price % 10_000;
    if (eok === 0) return `${remainder.toLocaleString()}만 원`;
    return remainder === 0 ? `${eok}억 원` : `${eok}억 ${remainder.toLocaleString()}만 원`;
}

function NeighborhoodDetailPage() {
    const { id } = useParams();
    const neighborhoodId = Number(id);

    const [neighborhood, setNeighborhood] = useState<NeighborhoodResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // AI 분석은 별도 호출이라 상태를 따로 둔다.
    // null 이면서 mlChecked 가 true 면 "매핑이 없어서 못 붙인" 것이고,
    // mlChecked 가 false 면 아직 응답을 기다리는 중이다.
    const [ml, setMl] = useState<MlNeighborhoodResponse | null>(null);
    const [mlChecked, setMlChecked] = useState(false);

    useEffect(() => {
        let active = true;

        const load = async () => {
            if (!Number.isInteger(neighborhoodId) || neighborhoodId < 1) {
                setError('올바르지 않은 동네 번호입니다.');
                setLoading(false);
                return;
            }

            setLoading(true);
            setMl(null);
            setMlChecked(false);

            try {
                const data = await getNeighborhood(neighborhoodId);
                if (!active) return;
                setNeighborhood(data);
            } catch (requestError) {
                console.error('동네 상세 조회 실패', requestError);
                if (active) setError('동네 정보를 찾을 수 없습니다.');
                return;
            } finally {
                if (active) setLoading(false);
            }

            // 법정동-행정동 매핑이 없는 동네도 있다. 그 경우는 오류가 아니라
            // "이 동네는 AI 분석 대상이 아니다"일 뿐이므로 화면 전체를 막지 않는다.
            try {
                const analysis = await getMlAnalysisForNeighborhood(neighborhoodId);
                if (active) setMl(analysis);
            } catch (requestError) {
                console.error('행정동 AI 분석 연결 실패', requestError);
                if (active) setMl(null);
            } finally {
                if (active) setMlChecked(true);
            }
        };

        load();

        return () => { active = false; };
    }, [neighborhoodId]);

    if (loading) return <main><section className="section"><div className="wrap neighborhood-state">동네 정보를 불러오는 중입니다.</div></section></main>;
    if (!neighborhood) return <main><section className="section"><div className="wrap neighborhood-state error">{error}</div></section></main>;

    // AI 분석이 붙었으면 그 매물 검색이 훨씬 정확하다(행정동 코드로 찾으므로).
    // 아직 안 붙었으면 동 이름으로라도 찾을 수 있게 한다 — 예전의 ?neighborhoodId= 는
    // 지도 검색 화면이 읽지 않는 조건이라 눌러도 아무 것도 좁혀지지 않았다.
    const propertyLink = ml
        ? `/map?adminCode=${encodeURIComponent(ml.adminCode)}&adminName=${encodeURIComponent(ml.adminName)}`
        : `/map?keyword=${encodeURIComponent(neighborhood.dong)}`;

    return (
        <main className="neighborhood-page">
            <section className="neighborhood-detail-hero"><div className="wrap">
                <div className="breadcrumb"><Link to="/neighborhood">동네 탐색</Link> / 상세</div>
                <span className="eyebrow">{neighborhood.city} {neighborhood.district}</span>
                <h1>{neighborhood.dong}</h1>
                <p>{neighborhood.description || '등록된 동네 소개가 없습니다.'}</p>
            </div></section>

            <section className="section"><div className="wrap neighborhood-detail-grid">
                <section className="card neighborhood-detail-main">
                    <h2>동네 정보</h2>
                    <div className="neighborhood-card-tags">
                        {neighborhood.tags.map((tag) => <span key={tag.id}>#{tag.name}</span>)}
                    </div>
                    <div className="neighborhood-detail-stats">
                        <div><span>평균 전세가</span><strong>{formatJeonsePrice(neighborhood.averageJeonsePrice)}</strong></div>
                        <div><span>공개 매물</span><strong>{neighborhood.propertyCount}건</strong></div>
                    </div>
                </section>

                <aside className="card neighborhood-detail-side">
                    <h2>이 동네 매물 보기</h2>
                    <p className="muted">지도 검색에서 {neighborhood.dong}의 공개 매물을 확인할 수 있습니다.</p>
                    <Link className="solid-btn" to={propertyLink}>지도 검색으로 이동</Link>
                </aside>
            </div></section>

            {/*
              행정동 AI 분석. 매핑이 있을 때만 붙는다.
              한줄평은 여기서만 남길 수 있다 — 행정동 코드(adminCode)가 있어야 저장되기 때문에
              매핑이 없는 동네에서는 한줄평 작성도 함께 비어 있다.
            */}
            {ml && (
                <section className="section"><div className="wrap">
                    <div className="card neighborhood-cluster">
                        <div className="section-head">
                            <div>
                                <span className="eyebrow">K-Means 동네 군집 분석</span>
                                <h2>이 동네의 유형</h2>
                            </div>
                        </div>

                        <strong className="neighborhood-cluster-name">{ml.clusterName}</strong>
                        <p className="neighborhood-cluster-desc">
                            같은 유형으로 묶인 동네들은 생활 환경의 짜임새가 서로 비슷합니다.
                            교통, 생활, 의료, 교육, 녹지 다섯 가지를 함께 본 결과이며,
                            맞춤 추천에서 이 동네가 추천된 이유이기도 합니다.
                        </p>
                        <span className="neighborhood-admin-code">행정동 코드 {ml.adminCode}</span>

                        <MlNeighborhoodMap
                            adminCode={ml.adminCode}
                            adminName={ml.adminName}
                            boundary={ml.boundary}
                        />
                    </div>

                    <NeighborhoodReviewSection
                        adminCode={ml.adminCode}
                        adminName={ml.adminName}
                        districtName={ml.districtName}
                        surveyReviews={ml.surveyReviews}
                    />
                </div></section>
            )}

            {/* 매핑이 없는 동네. 오류가 아니라 아직 연결되지 않았다는 뜻이라 안내만 한다. */}
            {mlChecked && !ml && (
                <section className="section"><div className="wrap">
                    <div className="card neighborhood-ml-empty">
                        이 동네는 아직 행정동 AI 분석에 연결되지 않았습니다.
                    </div>
                </div></section>
            )}
        </main>
    );
}

export default NeighborhoodDetailPage;
