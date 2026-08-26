/*
  매물 상세 "AI 시세예측" 그래프 자료.
  백엔드 PropertyPriceTrendDto / PricePointDto 와 1:1로 맞춰 두었다.

  근거로 쓸 자료가 매물마다 달라서 무엇을 보여 준 것인지 source 로 구분한다.

    TRANSACTION  : 국토부 아파트 매매 실거래가의 연도별 평균 (원래 목표한 시세 추이)
    NEIGHBORHOOD : 같은 조건 매물과의 시세 비교 (실거래가가 없을 때)
    NONE         : 둘 다 만들 수 없음 (빈 상자 대신 안내 문구를 보여 준다)

  실거래가는 국토부가 '아파트 매매'만 제공하므로 전세·월세나 아파트가 아닌 매물은
  TRANSACTION 이 될 수 없다.
*/

export type PriceTrendSource = 'TRANSACTION' | 'NEIGHBORHOOD' | 'NONE';

// 그래프의 막대 한 개
export type PricePoint = {
    label: string;        // "2024" 또는 "반포동 아파트 평균"
    price: number;        // 만원 단위
    count: number | null; // 몇 건을 근거로 나온 값인지 (이 매물·AI 예상은 null)
    current: boolean;     // 지금 보고 있는 매물 자신이면 true
};

export type PropertyPriceTrend = {
    source: PriceTrendSource;
    title: string;
    description: string | null;

    points: PricePoint[];

    aiPrice: number | null;
    currentPrice: number | null;
};
