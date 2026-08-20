/*
  행정동 AI 분석 상세 (K-Means 군집).

  주소는 /neighborhood/ml/:adminCode 다.
  기존 /neighborhood/:id 는 법정동 기준 동네 탐색 화면이고 이 화면과 별개다.
  둘은 코드 체계가 달라서 서로의 키를 넘겨 쓰면 안 된다.

  대표 키워드와 동네 한줄평은 텍스트마이닝 담당이 이 페이지에 이어서 붙인다.
  API 응답에는 이미 keywords / reviewDocumentCount 가 들어 있지만
  여기서는 군집 결과까지만 그린다.
*/

import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { getMlNeighborhood } from '../api/neighborhoodApi';
import type { MlNeighborhoodResponse } from '../types/MlNeighborhood';
import '../styles/MlNeighborhoodDetailPage.css';

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
                        서울 행정동의 교통·생활·의료·교육·녹지 지표를 함께 묶어
                        비슷한 성격끼리 나눈 결과입니다.
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

                    {/*
                      대표 키워드와 동네 한줄평은 텍스트마이닝 담당이 이 아래에 이어 붙인다.
                      그때 넘길 값은 법정동 번호가 아니라 analysis.adminCode 다.
                    */}
                </div>
            </section>
        </main>
    );
}

export default MlNeighborhoodDetailPage;
