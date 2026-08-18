/*
  추천 동네 카드 한 장.

  행정동 군집 분석 결과가 붙으면 군집 이름(clusterName)까지 함께 나온다.
  아직 그 결과가 없어서 지금은 지금 있는 동네 자료로 계산한 값이 들어오고,
  그때는 neighborhoodId 로 동네 상세 화면을 연다.

  법정동과 행정동은 코드 체계가 서로 달라서 같은 키로 볼 수 없다.
  그래서 분석 결과가 붙기 전에는 상세로 갈 수 있고, 붙은 뒤에는
  neighborhoodId 가 비어 있어 이동 버튼을 감춘다.
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

            {item.neighborhoodId != null && (
                <button
                    type="button"
                    className="hoodrec-link"
                    onClick={() => navigate(`/neighborhood/${item.neighborhoodId}`)}
                >
                    동네 살펴보기
                </button>
            )}
        </article>
    );
}

export default NeighborhoodRecommendCard;
