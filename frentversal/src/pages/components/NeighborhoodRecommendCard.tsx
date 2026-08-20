/*
  추천 동네 카드 한 장.

  이동할 곳이 두 군데다.

  "AI 동네 분석"  → /neighborhood/ml/:adminCode  (행정동. K-Means 군집 결과)
  "동네 살펴보기" → /neighborhood/:id            (법정동. 기존 동네 탐색 화면)

  법정동과 행정동은 코드 체계가 서로 달라서 같은 키로 볼 수 없다.
  서버는 두 값을 각각 채우려 시도하고, 동 이름이 이 서버의 동네 자료에도 있으면
  둘 다 값이 있다. 그래서 각 버튼은 자기 값이 있을 때만 따로 나온다.
  두 값을 서로 바꿔 넣으면 엉뚱한 동네가 열린다.
*/

import { useNavigate } from 'react-router-dom';

import type { NeighborhoodRecommendationItem } from '../../types/Recommendation';
import '../../styles/NeighborhoodRecommendCard.css';

interface Props {
    item: NeighborhoodRecommendationItem;
    rank: number;
}

function NeighborhoodRecommendCard({ item, rank }: Props) {
    const navigate = useNavigate();

    return (
        <article className="hoodrec-card">
            <div className="hoodrec-head">
                <span className="hoodrec-rank">TOP {rank}</span>
                <span className="hoodrec-score">적합도 {item.score}%</span>
            </div>

            <h3 className="hoodrec-name">
                {item.districtName} {item.adminName}
            </h3>

            {item.clusterName && <div className="hoodrec-cluster">{item.clusterName}</div>}

            {item.reasons.length > 0 && (
                <div className="hoodrec-reasons">
                    {item.reasons.map((reason) => (
                        <span key={reason}>{reason}</span>
                    ))}
                </div>
            )}

            <div className="hoodrec-links">
                {item.adminCode && (
                    <button
                        type="button"
                        className="hoodrec-link"
                        onClick={() => navigate(`/neighborhood/ml/${item.adminCode}`)}
                    >
                        AI 동네 분석 보기
                    </button>
                )}

                {item.neighborhoodId != null && (
                    <button
                        type="button"
                        className="hoodrec-link hoodrec-link-quiet"
                        onClick={() => navigate(`/neighborhood/${item.neighborhoodId}`)}
                    >
                        동네 살펴보기
                    </button>
                )}
            </div>
        </article>
    );
}

export default NeighborhoodRecommendCard;
