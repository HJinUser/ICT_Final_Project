/*
  매물 주변시설 타입.

  값은 파이썬(FastAPI)이 매물 좌표를 기준으로 반경 안의 시설을 골라 준 것이고,
  Spring 의 GET /property/{id}/nearby 가 그대로 전달한다.

  반경은 종류마다 다르며 AI 시세예측이 세는 반경과 같은 값을 쓴다.
  화면에 보이는 개수와 예측이 참고한 개수가 어긋나면 설명할 수 없기 때문이다.
*/

export type NearbyPlaceCategory = 'station' | 'bus' | 'hospital' | 'convenience';

export type NearbyPlace = {
    name: string;
    latitude: number;
    longitude: number;
    // 매물로부터의 직선거리(m)
    distanceM: number;
};

// 종류별 시설 목록. 파이썬이 꺼져 있으면 서버가 빈 객체를 주므로 각 항목이 없을 수 있다.
export type NearbyPlaceResponse = Partial<Record<NearbyPlaceCategory, NearbyPlace[]>>;

// 지도 범례와 토글 칩에 쓰는 표시 정보.
// 색은 tokens.css 의 토큰이 아니라 직접 지정한다. 지도 위 마커는 CSS 변수를 쓸 수 없기 때문이다.
export const NEARBY_CATEGORY_META: Record<
    NearbyPlaceCategory,
    { label: string; color: string; radiusM: number }
> = {
    station: { label: '지하철역', color: '#4B0082', radiusM: 1000 },
    bus: { label: '버스정류소', color: '#2E6F52', radiusM: 500 },
    hospital: { label: '병원', color: '#9C4A1A', radiusM: 1000 },
    convenience: { label: '편의점', color: '#1F5C8B', radiusM: 500 },
};

// 화면에 그릴 순서. 객체 키 순서에 기대지 않도록 따로 둔다.
export const NEARBY_CATEGORY_ORDER: NearbyPlaceCategory[] = [
    'station',
    'bus',
    'hospital',
    'convenience',
];
