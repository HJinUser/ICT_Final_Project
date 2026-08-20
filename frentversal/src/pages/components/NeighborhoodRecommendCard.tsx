/*
  추천 동네 카드 한 장.

  버튼이 두 개인데, 같은 화면의 중복이 아니라 answer 가 다른 두 질문이다.

  "왜 이 동네를 추천했나"  → AI 동네 분석   → /neighborhood/ml/:adminCode
  "여기 집이 얼마나 있나"  → 매물·시세 보기 → /neighborhood/:id

  앞은 파이썬이 계산한 행정동 군집 결과이고, 뒤는 관리자가 등록한 법정동 동네 자료다.
  행정동과 법정동은 경계가 서로 달라 1:1 로 대응하지 않기 때문에 두 값을 합칠 수 없다.
  서버는 둘을 각각 채우므로 버튼은 자기 값이 있을 때만 나온다.
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
                        AI 동네 분석
                    </button>
                )}

                {item.neighborhoodId != null && (
                    <button
                        type="button"
                        className="hoodrec-link hoodrec-link-quiet"
                        onClick={() => navigate(`/neighborhood/${item.neighborhoodId}`)}
                    >
                        매물·시세 보기
                    </button>
                )}
            </div>
        </article>
    );
}

export default NeighborhoodRecommendCard;
