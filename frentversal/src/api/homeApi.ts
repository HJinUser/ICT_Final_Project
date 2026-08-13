// 메인 홈페이지 데이터를 가져오는 API 레이어.
//
// 아직 서버에 이 엔드포인트가 없어서 지금은 예시 데이터를 돌려준다.
// 화면(HomePage.tsx)은 이 함수만 호출하므로, 서버가 준비되면 getHomeData() 본문을
// 아래 주석의 customAxios 호출로 바꾸기만 하면 되고 화면 코드는 그대로 둘 수 있다.
// (다른 API 파일 - agencyApi.ts 등 - 과 같은 구조로 맞춰 두었다.)

import type { HomeData } from '../types/Home';

// 서버가 붙으면 아래 두 줄의 주석을 풀고 MOCK_HOME_DATA 반환부를 지운다.
// import customAxios from './axiosInstance';

// 예시 이미지. 실제 매물 사진이 붙기 전까지 화면 확인용으로만 쓴다.
const PHOTO = (id: string, w = 800) =>
    `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=70`;

const MOCK_HOME_DATA: HomeData = {
    weeklyLowCount: 128,

    weeklyProperties: [
        {
            id: 1,
            imageUrl: PHOTO('1502672260266-1c1ef2d93688'),
            priceLabel: '전세 4억 9,000',
            summary: '서초구 반포동 · 84㎡ · 12층',
            transit: '반포역 도보 4분',
            marketPriceLabel: '동네 시세 5억 4,000',
            diffLabel: '시세보다 5,000만 낮음',
            level: 'LOW',
            gaugePosition: 32,
        },
        {
            id: 2,
            imageUrl: PHOTO('1484154218962-a197022b5858'),
            priceLabel: '전세 4억 4,000',
            summary: '서초구 서초동 · 66㎡ · 6층',
            transit: '서초역 도보 5분',
            marketPriceLabel: '동네 시세 4억 6,900',
            diffLabel: '시세보다 2,900만 낮음',
            level: 'LOW',
            gaugePosition: 36,
        },
        {
            id: 3,
            imageUrl: PHOTO('1560448204-e02f11c3d0e2'),
            priceLabel: '전세 3억 8,000',
            summary: '서초구 방배동 · 66㎡ · 3층',
            transit: '방배역 도보 9분',
            marketPriceLabel: '동네 시세 3억 9,800',
            diffLabel: '시세보다 1,800만 낮음',
            level: 'LOW',
            gaugePosition: 40,
        },
        {
            id: 4,
            imageUrl: PHOTO('1522708323590-d24dbb6b0267'),
            priceLabel: '전세 5억 7,000',
            summary: '서초구 반포동 · 74㎡ · 15층',
            transit: '고속터미널역 도보 6분',
            marketPriceLabel: '동네 시세 5억 6,000',
            diffLabel: '동네 시세와 비슷',
            level: 'MID',
            gaugePosition: 52,
        },
    ],

    neighborhoods: [
        {
            id: 1,
            name: '방배동',
            imageUrl: PHOTO('1512917774080-9991f1c4c750', 1000),
            kind: '조용한 주거형',
            stats: ['평균 전세 4억 1,000', '역까지 12분', '매물 231건'],
            tags: ['조용함', '공원 인접', '언덕 있음', '주차 여유'],
        },
        {
            id: 2,
            name: '반포동',
            imageUrl: PHOTO('1600596542815-ffad4c1539a9'),
            kind: '역세권 밀집형',
            stats: ['평균 전세 5억 8,000', '역까지 4분'],
            tags: [],
        },
        {
            id: 3,
            name: '서초동',
            imageUrl: PHOTO('1600607687939-ce8a6c25118c'),
            kind: '신축 위주형',
            stats: ['평균 전세 5억 2,000', '준공 2021년'],
            tags: [],
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

    cloudNeighborhood: '반포동',
    cloudSourceCount: 312,
    cloudWords: [
        { text: '조용함', weight: 1 },
        { text: '배달 잘됨', weight: 2 },
        { text: '주차난', weight: 3 },
        { text: '역세권', weight: 2 },
        { text: '언덕 없음', weight: 4 },
        { text: '채광 좋음', weight: 3 },
        { text: '벌레 없음', weight: 5 },
        { text: '마트 가까움', weight: 4 },
        { text: '관리비', weight: 3 },
        { text: '층간소음', weight: 5 },
        { text: '공원 산책', weight: 4 },
        { text: '버스 자주', weight: 5 },
        { text: '한강 가까움', weight: 4 },
        { text: '편의점 많음', weight: 5 },
    ],
};

// 메인 홈페이지에 필요한 데이터를 한 번에 받아온다.
// 서버 준비 후에는 아래 내용을 다음 한 줄로 교체한다.
//   const response = await customAxios.get<HomeData>('/home');
//   return response.data;
export async function getHomeData(): Promise<HomeData> {
    return Promise.resolve(MOCK_HOME_DATA);
}
