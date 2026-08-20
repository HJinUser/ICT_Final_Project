/*
  행정동 AI 분석 상세 (K-Means 군집).

  이 화면이 답하는 질문은 "이 동네는 어떤 성격인가" 하나다.
  집값·매물 목록은 여기 없고 동네 탐색(/neighborhood/:id)이 맡는다.
  그쪽은 관리자가 등록한 법정동 자료이고 이 화면은 파이썬이 계산한 행정동 자료라,
  경계가 서로 달라 1:1 로 대응하지 않는다. 서로의 키를 넘겨 쓰면 안 된다.

  아래쪽 한줄평은 NeighborhoodReviewSection 이 맡는다. 그 부품에는 법정동 id 가 아니라
  analysis.adminCode 를 넘긴다.

  대표 키워드(keywords / reviewDocumentCount)는 응답에 이미 들어 있지만 아직 그리지 않는다.
*/

import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { getMlNeighborhood } from '../api/neighborhoodApi';
import type { MlNeighborhoodResponse } from '../types/MlNeighborhood';
import '../styles/MlNeighborhoodDetailPage.css';
import NeighborhoodReviewSection from './components/NeighborhoodReviewSection';

function MlNeighborhoodDetailPage() {
    const { adminCode } = useParams();

    const [analysis, setAnalysis] = useState<MlNeighborhoodResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        // 응답이 늦게 도착했을 때 이미 떠난 화면의 상태를 건드리지 않도록 막는다.
        let active = true;

        const load = async () => {
            setLoading(true);
            setError('');

            if (!adminCode || !/^\d+$/.test(adminCode)) {
                if (active) {
                    setAnalysis(null);
                    setError('올바르지 않은 행정동 코드입니다.');
                    setLoading(false);
                }
                return;
            }

            try {
                const data = await getMlNeighborhood(adminCode);
                if (active) setAnalysis(data);
            } catch (requestError) {
                console.error('행정동 AI 분석 조회 실패', requestError);
                if (active) {
                    setAnalysis(null);
                    // 분석 대상이 아닌 동네일 때 서버가 404를 준다. 사용자에게는 같은 안내로 충분하다.
                    setError('이 동네의 AI 분석 결과를 찾을 수 없습니다.');
                }
            } finally {
                if (active) setLoading(false);
            }
        };

        load();

        return () => {
            active = false;
        };
    }, [adminCode]);

    if (loading) {
        return (
            <main>
                <section className="section">
                    <div className="wrap mlhood-state">AI 동네 분석을 불러오는 중입니다.</div>
                </section>
            </main>
        );
    }

    if (!analysis) {
        return (
            <main>
                <section className="section">
                    <div className="wrap mlhood-state mlhood-state-error">
                        <p>{error}</p>
                        <Link className="outline-btn" to="/recommend">맞춤 추천으로 돌아가기</Link>
                    </div>
                </section>
            </main>
        );
    }

    return (
        <main className="mlhood-page">
            <section className="mlhood-hero">
                <div className="wrap">
                    <div className="breadcrumb">
                        <Link to="/recommend">맞춤 추천</Link> / AI 동네 분석
                    </div>
                    <span className="eyebrow">K-Means 동네 군집 분석</span>
                    <h1>{analysis.districtName} {analysis.adminName}</h1>
                    <p>
                        교통·생활·의료·교육·녹지 다섯 가지를 한꺼번에 보고,
                        성격이 비슷한 동네끼리 묶었습니다.
                        추천 목록에 이 동네가 올라온 이유를 여기서 확인할 수 있습니다.
                    </p>
                </div>
            </section>

            <section className="section">
                <div className="wrap">
                    <div className="card mlhood-cluster">
                        <span className="mlhood-label">이 동네의 유형</span>
                        <strong className="mlhood-cluster-name">{analysis.clusterName}</strong>
                        <p className="mlhood-cluster-desc">
                            같은 유형으로 묶인 동네들은 생활 환경의 짜임새가 서로 비슷합니다.
                            지금 사는 곳과 같은 유형을 고르면 익숙한 생활을 유지하기 쉽고,
                            다른 유형을 고르면 생활 방식이 달라집니다.
                        </p>
                        <span className="mlhood-code">행정동 코드 {analysis.adminCode}</span>
                    </div>

                    {/* 이 화면에는 매물이 없다. 찾으러 갈 곳을 알려 준다. */}
                    <div className="mlhood-next">
                        <p>
                            이 화면은 동네의 성격만 다룹니다.
                            시세와 매물은 지도 검색에서 볼 수 있습니다.
                        </p>
                        <Link className="outline-btn" to={`/map?keyword=${encodeURIComponent(analysis.adminName)}`}>
                            {analysis.adminName} 매물 보기
                        </Link>
                    </div>

                    {/* 동네 상세 화면에 해당 동네의 한줄평 목록·작성 컴포넌트를 연결함 */}
                    <NeighborhoodReviewSection
                        adminCode={analysis.adminCode}
                        adminName={analysis.adminName}
                        districtName={analysis.districtName}
                    />
                </div>
            </section>
        </main>
    );
}

export default MlNeighborhoodDetailPage;
