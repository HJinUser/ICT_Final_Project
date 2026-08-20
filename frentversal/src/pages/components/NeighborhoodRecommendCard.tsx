/*
  추천 동네 카드 한 장.

  버튼이 두 개인데, 같은 화면의 중복이 아니라 답이 다른 두 질문이다.

  "왜 이 동네를 추천했나"  → AI 동네 분석   → /neighborhood/ml/:adminCode
  "여기 집이 얼마나 있나"  → 매물·시세 보기 → /map?adminCode=...

  둘 다 행정동 코드로 간다. 추천은 파이썬이 행정동 단위로 계산하고,
  매물에도 등록할 때 좌표로 판정한 행정동을 적어 두었기 때문이다.

  동 이름으로 넘기면 안 된다. 매물에 붙은 dong 은 법정동이라 경계가 서로 달라서,
  이름으로 찾으면 425개 행정동 중 338개가 한 건도 안 걸린다.
  (관악구 신림동 매물이 행정동으로는 미성동인 식이다)
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

    // 아래 버튼들의 onClick 은 나중에 실행되므로 item.adminCode 의 null 검사가 그대로 이어지지 않는다.
    // 값을 여기서 한 번 꺼내 두면 두 버튼이 같은 검사 결과를 쓴다.
    const adminCode = item.adminCode;

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
                {adminCode && (
                    <button
                        type="button"
                        className="hoodrec-link"
                        onClick={() => navigate(`/neighborhood/ml/${encodeURIComponent(adminCode)}`)}
                    >
                        AI 동네 분석
                    </button>
                )}

                {adminCode && (
                    <button
                        type="button"
                        className="hoodrec-link hoodrec-link-quiet"
                        onClick={() => navigate(
                            `/map?adminCode=${encodeURIComponent(adminCode)}`
                            + `&adminName=${encodeURIComponent(item.adminName)}`,
                        )}
                    >
                        매물·시세 보기
                    </button>
                )}
            </div>
        </article>
    );
}

export default NeighborhoodRecommendCard;
