/*메인 홈페이지 데이터를 가져오는 API 레이어.

"/home" 이라는 단일 엔드포인트는 백엔드에 없다. 그래서 이미 있는 매물 검색(/property/search)·
매물 비교(/property/home-compare)·동네 탐색(/neighborhoods) API를 조합해서 "이번 주 매물"·
"두 집, 나란히 비교해보세요"·"동네부터 고르는 방법" 구역은 실제 값으로 채운다.
한줄평은 대응하는 백엔드가 아직 없어서 예시 데이터를 그대로 쓴다
— 화면 아래 MOCK_HOME_DATA 주석 참고.

워드클라우드는 여기서 내려보내지 않는다. 텍스트마이닝이 만든 PNG를 화면이 직접 불러 쓰므로
HomePage.tsx의 WORDCLOUD 상수를 참고할 것.*/

import type { HomeData, WeeklyProperty, HomeNeighborhood, HomeRecommendation } from '../types/Home';
import { searchProperties, getHomeCompareHighlights } from './propertySearchApi';
import { getNeighborhoods } from './neighborhoodApi';
import { getRecommendations } from './recommendationApi';
import { formatManwon } from '../utils/propertyPrice';
import type { PropertySearchItem } from '../types/PropertySearch';
import type { NeighborhoodResponse } from '../types/Neighborhood';
import type { RecommendationItem } from '../types/Recommendation';
import type { User } from '../types/User';

// weeklyLowCount·weeklyProperties·neighborhoods 는 실제 API(searchProperties·getNeighborhoods)로 채우므로
// 목업에는 없다. 아래는 아직 대응하는 백엔드가 없는 구역만 남긴 예시 데이터다.
const MOCK_HOME_DATA: Omit<HomeData, 'weeklyLowCount' | 'weeklyProperties' | 'neighborhoods' | 'compare'| 'recommendations'> = {
    voices: [
        {
            id: 1,
            neighborhood: '반포동',
            content: '밤에 조용한 편이고 배달이 잘 들어옵니다. 주차 자리는 저녁 9시 넘으면 거의 없어요.',
            createdAt: '2026.07.12',
        },
        {
            id: 2,
            neighborhood: '방배동',
            content: '언덕이 좀 있어서 자전거는 포기했습니다. 대신 골목이 넓고 사람이 적어서 저녁 산책이 좋아요.',
            createdAt: '2026.06.28',
        },
        {
            id: 3,
            neighborhood: '서초동',
            content: '새 건물이 많아서 관리는 깔끔한데 관리비가 생각보다 나갑니다. 남향이라 겨울에도 해는 잘 듭니다.',
            createdAt: '2026.06.02',
        },
    ],
};

const WEEKLY_CARD_LIMIT = 4;
const HOME_NEIGHBORHOOD_LIMIT = 3;
const HOME_RECOMMEND_LIMIT = 3;

function toWeeklyProperty(item: PropertySearchItem): WeeklyProperty {
    const summary = [
        [item.gu, item.dong].filter(Boolean).join(' '),
        item.areaLabel,
        item.floor ? `${item.floor}층` : null,
    ].filter(Boolean).join(' · ');

    return {
        id: item.id,
        imageUrl: item.thumbnailUrl ?? '',
        priceLabel: item.priceLabel,
        summary,
        // 최근접 지하철역 "이름"은 백엔드가 아직 안 내려준다(거리만 있고 역 이름이 없다) — 비워 둔다.
        transit: '',
        // 이 함수는 이미 priceEvaluation === 'UNDERVALUED'로 걸러진 매물만 받는다(getHomeData 참고).
        priceEvaluation: 'UNDERVALUED',
    };
}

// 맞춤 추천 결과 한 건을 메인 화면 카드 모양으로 줄인다.
// 지도 검색 카드(PropertySearchItem)와 같은 요약 규칙(구·동·평수·층)을 그대로 쓴다.
function toHomeRecommendation(item: RecommendationItem): HomeRecommendation {
    const property = item.property;
    const summary = [
        [property.gu, property.dong].filter(Boolean).join(' '),
        property.areaLabel,
        property.floor ? `${property.floor}층` : null,
    ].filter(Boolean).join(' · ');

    return {
        id: item.propertyId,
        imageUrl: property.thumbnailUrl ?? '',
        priceLabel: property.priceLabel,
        summary,
        // 추천 이유가 여러 개면 한 줄로 이어 붙인다. 서버가 하나도 안 주는 경우를 대비해 기본 문구를 둔다.
        reason: item.reasons.length > 0 ? item.reasons.join(' · ') : '취향 조건에 맞는 매물입니다.',
        fitScore: item.score,
    };
}

function toHomeNeighborhood(neighborhood: NeighborhoodResponse): HomeNeighborhood {
    const stats = [
        neighborhood.averageJeonsePrice > 0 ? `평균 전세 ${formatManwon(neighborhood.averageJeonsePrice)}` : null,
        `매물 ${neighborhood.propertyCount}건`,
    ].filter((value): value is string => value !== null);

    return {
        id: neighborhood.id,
        name: neighborhood.dong,
        district: neighborhood.district,
        imageUrl: neighborhood.imageUrl ?? '',
        // K-means 군집 같은 "동네 성격" 분류는 아직 없어서, 등록된 태그 중 첫 번째로 대신한다.
        kind: neighborhood.tags[0]?.name ?? neighborhood.district,
        stats,
        tags: neighborhood.tags.slice(1).map((tag) => tag.name),
    };
}

// 메인 홈페이지에 필요한 데이터를 한 번에 받아온다.
// weeklyLowCount·weeklyProperties·neighborhoods 는 실제 API를 조합해서 채우고,
// 나머지(한줄평·워드클라우드)는 대응하는 백엔드가 생기기 전까지 예시 데이터를 쓴다.
export async function getHomeData(user: User | null): Promise<HomeData> {
    // 맞춤 추천은 일반 사용자(USER) 전용 API
    const wantsRecommendations = user?.role === 'USER';

    const [propertyResult, neighborhoodResult, compareResult, recommendationResult] = await Promise.all([
        searchProperties({ sort: 'LATEST' }),
        getNeighborhoods({ sort: 'POPULAR' }),
        getHomeCompareHighlights(),
        wantsRecommendations
            ? getRecommendations().catch((error) => {
                console.error('맞춤 추천 미리보기 조회 실패:', error);
                return null;
            })
            : Promise.resolve(null),
    ]);

    // "시세보다 싸게 나온 집" = 관리자가 저평가(UNDERVALUED)로 평가한 매물.
    // searchProperties를 이미 LATEST 정렬로 불렀으므로 그 순서를 그대로 쓴다.
    const lowItems = propertyResult.content
        .filter((item) => item.priceEvaluation === 'UNDERVALUED');

    const recommendations = recommendationResult
        ? recommendationResult.items.slice(0, HOME_RECOMMEND_LIMIT).map(toHomeRecommendation)
        : [];

    return {
        ...MOCK_HOME_DATA,
        weeklyLowCount: lowItems.length,
        weeklyProperties: lowItems.slice(0, WEEKLY_CARD_LIMIT).map(toWeeklyProperty),
        neighborhoods: neighborhoodResult.content.slice(0, HOME_NEIGHBORHOOD_LIMIT).map(toHomeNeighborhood),
        compare: compareResult,
        recommendations,
    };
}
