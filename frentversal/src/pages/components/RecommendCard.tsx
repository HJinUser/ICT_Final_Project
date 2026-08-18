/*
  맞춤 추천 매물 카드 한 장.

  첫 번째 카드는 화면 너비를 다 쓰고 나머지는 반씩 나눠 쓴다.
  어느 쪽으로 그릴지는 부모가 wide 로 알려 준다.

  점수와 추천 이유는 이 부품이 계산하지 않는다. 서버가 준 값을 그대로 보여 주기만 한다.
*/

import { useNavigate } from 'react-router-dom';

import type { RecommendationItem } from '../../types/Recommendation';
import '../../styles/RecommendCard.css';

interface Props {
    item: RecommendationItem;
    wide: boolean;
    // 이 카드에 이미 평가를 남겼는지. 남겼으면 버튼을 눌린 모양으로 보여 준다.
    feedback: 'LIKE' | 'DISLIKE' | null;
    busy: boolean;
    favorited: boolean;
    onLike: () => void;
    onDislike: () => void;
    onSetBest: () => void;
    onToggleFavorite: () => void;
}

function RecommendCard({
    item,
    wide,
    feedback,
    busy,
    favorited,
    onLike,
    onDislike,
    onSetBest,
    onToggleFavorite,
}: Props) {
    const navigate = useNavigate();

    const property = item.property;

    // 면적과 방 개수, 층수는 값이 없을 수 있어서 있는 것만 이어 붙인다.
    const specs = [
        property.areaLabel,
        property.roomCount == null ? null : `방 ${property.roomCount}개`,
        property.floor == null ? null : `${property.floor}층`,
    ].filter((text): text is string => Boolean(text));

    return (
        <article className={wide ? 'rec-card wide' : 'rec-card'}>
            <button
                type="button"
                className="rec-photo"
                style={
                    property.thumbnailUrl
                        ? { backgroundImage: `url('${property.thumbnailUrl}')` }
                        : undefined
                }
                aria-label={`${property.name} 상세 보기`}
                onClick={() => navigate(`/property/${item.propertyId}`)}
            >
                {!property.thumbnailUrl && <span className="rec-noimage">사진 준비 중</span>}
            </button>

            <div className="rec-body">
                <div className="rec-badges">
                    {item.userBest && <span className="rec-badge best">내 BEST</span>}
                    {item.aiBest && <span className="rec-badge ai">AI 추천 1순위</span>}
                    <span className="rec-badge fit">추천 적합도 {item.score}%</span>
                </div>

                <h3 className="rec-name">{property.name}</h3>
                <div className="rec-price">{property.priceLabel}</div>

                <p className="rec-meta">
                    {property.address}
                    {specs.length > 0 && ` · ${specs.join(' · ')}`}
                </p>

                {/* 적합도 막대. 숫자만으로는 다른 카드와 비교하기 어려워서 길이로도 보여 준다. */}
                <div className="rec-fitbar">
                    <div className="track">
                        <div className="on" style={{ width: `${Math.min(100, Math.max(0, item.score))}%` }} />
                    </div>
                </div>

                {item.reasons.length > 0 && (
                    <div className="rec-reasons">
                        {item.reasons.map((reason) => (
                            <span key={reason}>{reason}</span>
                        ))}
                    </div>
                )}

                <div className="rec-actions">
                    <button
                        type="button"
                        className={feedback === 'LIKE' ? 'rec-act on' : 'rec-act'}
                        disabled={busy}
                        onClick={onLike}
                    >
                        잘 맞아요
                    </button>
                    <button
                        type="button"
                        className={feedback === 'DISLIKE' ? 'rec-act on' : 'rec-act'}
                        disabled={busy}
                        onClick={onDislike}
                    >
                        내 취향과 달라요
                    </button>
                    <button
                        type="button"
                        className={item.userBest ? 'rec-act on' : 'rec-act'}
                        disabled={busy || item.userBest}
                        onClick={onSetBest}
                    >
                        내 BEST
                    </button>
                    <button
                        type="button"
                        className={favorited ? 'rec-act on' : 'rec-act'}
                        disabled={busy}
                        onClick={onToggleFavorite}
                    >
                        {favorited ? '관심 해제' : '관심 등록'}
                    </button>
                    <button
                        type="button"
                        className="rec-act detail"
                        onClick={() => navigate(`/property/${item.propertyId}`)}
                    >
                        상세 보기
                    </button>
                </div>
            </div>
        </article>
    );
}

export default RecommendCard;
