import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { getNeighborhood } from '../api/neighborhoodApi';
import type { NeighborhoodResponse } from '../types/Neighborhood';
import '../assets/common.css';
import '../assets/responsive.css';
import '../components/Neighborhood.css';

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

    useEffect(() => {
        let active = true;
        const load = async () => {
            if (!Number.isInteger(neighborhoodId) || neighborhoodId < 1) {
                setError('올바르지 않은 동네 번호입니다.');
                setLoading(false);
                return;
            }
            try {
                const data = await getNeighborhood(neighborhoodId);
                if (active) setNeighborhood(data);
            } catch (requestError) {
                console.error('동네 상세 조회 실패', requestError);
                if (active) setError('동네 정보를 찾을 수 없습니다.');
            } finally {
                if (active) setLoading(false);
            }
        };
        load();
        return () => { active = false; };
    }, [neighborhoodId]);

    if (loading) return <main><section className="section"><div className="wrap neighborhood-state">동네 정보를 불러오는 중입니다.</div></section></main>;
    if (!neighborhood) return <main><section className="section"><div className="wrap neighborhood-state error">{error}</div></section></main>;

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
                    <Link className="solid-btn" to={`/map?neighborhoodId=${neighborhood.id}`}>지도 검색으로 이동</Link>
                </aside>
            </div></section>
        </main>
    );
}

export default NeighborhoodDetailPage;
