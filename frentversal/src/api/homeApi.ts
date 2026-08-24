// 메인 홈페이지 데이터를 가져오는 API 레이어.
//
// "/home" 이라는 단일 엔드포인트는 백엔드에 없다. 그래서 이미 있는 매물 검색(/property/search)과
// 동네 탐색(/neighborhoods) API 두 개를 조합해서 "이번 주 매물"·"동네부터 고르는 방법" 구역은
// 실제 값으로 채운다. 나머지(맞춤 추천·매물 비교·한줄평)는 대응하는 백엔드가 아직
// 없어서 예시 데이터를 그대로 쓴다 — 화면 아래 MOCK_HOME_DATA 주석 참고.
//
// 워드클라우드는 여기서 내려보내지 않는다. 텍스트마이닝이 만든 PNG를 화면이 직접 불러 쓰므로
// HomePage.tsx의 WORDCLOUD 상수를 참고할 것.

import type { HomeData, WeeklyProperty, HomeNeighborhood } from '../types/Home';
import { searchProperties } from './propertySearchApi';
import { getNeighborhoods } from './neighborhoodApi';
import { formatManwon } from '../utils/propertyPrice';
import type { PropertySearchItem } from '../types/PropertySearch';
import type { NeighborhoodResponse } from '../types/Neighborhood';

// 예시 이미지. 실제 매물 사진이 붙기 전까지 화면 확인용으로만 쓴다.
const PHOTO = (id: string, w = 800) =>
    `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=70`;

// weeklyLowCount·weeklyProperties·neighborhoods 는 실제 API(searchProperties·getNeighborhoods)로 채우므로
// 목업에는 없다. 아래는 아직 대응하는 백엔드가 없는 구역만 남긴 예시 데이터다.
const MOCK_HOME_DATA: Omit<HomeData, 'weeklyLowCount' | 'weeklyProperties' | 'neighborhoods'> = {
    // 맞춤 추천 미리보기.
    // 추천 모델이 붙기 전이라 취향 태그를 만족한 매물을 손으로 골라 둔 예시다.
    recommendations: [
        {
            id: 11,
            imageUrl: PHOTO('1493809842364-78817add7ffb'),
            priceLabel: '전세 3억 6,000',
            summary: '서초구 방배동 · 59㎡ · 4층',
            reason: '역 도보 5분 · 신축 5년 이내 · 주차 가능',
            fitScore: 94,
        },
        {
            id: 12,
            imageUrl: PHOTO('1554995207-c18c203602cb'),
            priceLabel: '전세 4억 1,000',
            summary: '서초구 서초동 · 66㎡ · 9층',
            reason: '조용한 동네 · 남향 채광 · 공원 인접',
            fitScore: 88,
        },
        {
            id: 13,
            imageUrl: PHOTO('1486406146926-c627a92ad1ab'),
            priceLabel: '월세 2,000 / 85',
            summary: '서초구 반포동 · 42㎡ · 7층',
            reason: '반려동물 가능 · 마트 도보 6분 · 낮은 관리비',
            fitScore: 81,
        },
    ],

    // 매물 비교해보기 예시. 이번 주 매물 중 가격 편차가 가장 큰 두 건을 그대로 가져다 썼다.
    // 금액·AI 시세·관리비는 만원 단위 정수다. 승자 강조는 화면에서 이 숫자로 직접 계산한다.
    compareExample: [
        {
            id: 1,
            name: '반포 리버뷰',
            imageUrl: PHOTO('1502672260266-1c1ef2d93688', 600),
            dealTypeLabel: '전세',
            price: 49_000,
            aiPrice: 54_000,
            maintenanceCost: 12,
            area: 84,
            stationMinutes: 4,
            tags: ['한강 도보권', '역세권', '남향 채광', '주차 여유', '대형마트 6분'],
            aiScore: 92,
            neighborhood: '반포동',
        },
        {
            id: 2,
            name: '서초 센트럴',
            imageUrl: PHOTO('1484154218962-a197022b5858', 600),
            dealTypeLabel: '전세',
            price: 44_000,
            aiPrice: 46_900,
            maintenanceCost: 9,
            area: 66,
            stationMinutes: 5,
            tags: ['학원가', '공원 인접', '조용함', '편의점 다수'],
            aiScore: 86,
            neighborhood: '서초동',
        },
    ],

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
// 나머지(맞춤 추천·매물 비교·한줄평·워드클라우드)는 대응하는 백엔드가 생기기 전까지 예시 데이터를 쓴다.
export async function getHomeData(): Promise<HomeData> {
    const [propertyResult, neighborhoodResult] = await Promise.all([
        searchProperties({ sort: 'LATEST' }),
        getNeighborhoods({ sort: 'POPULAR' }),
    ]);

    // "시세보다 싸게 나온 집" = 관리자가 저평가(UNDERVALUED)로 평가한 매물.
    // searchProperties를 이미 LATEST 정렬로 불렀으므로 그 순서를 그대로 쓴다.
    const lowItems = propertyResult.content
        .filter((item) => item.priceEvaluation === 'UNDERVALUED');

    return {
        ...MOCK_HOME_DATA,
        weeklyLowCount: lowItems.length,
        weeklyProperties: lowItems.slice(0, WEEKLY_CARD_LIMIT).map(toWeeklyProperty),
        neighborhoods: neighborhoodResult.content.slice(0, HOME_NEIGHBORHOOD_LIMIT).map(toHomeNeighborhood),
    };
}
