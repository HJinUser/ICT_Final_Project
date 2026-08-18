/*
  메인 홈페이지 "두 집, 나란히 비교해보세요" 표의 행을 만드는 변환 함수.

  화면정의서(페이지 구성 V2 - 매물 비교 페이지)의 표 구성을 그대로 따른다.
      사진 | 금액 | AI 시세 | 시세 차이 | 면적 | 역 거리 | 관리비 | 주변 환경 | AI 추천 점수
  그리고 "가장 좋은 옵션에 강조 표시하기 (체크 표시도 같이)" 규칙에 따라
  행마다 어느 쪽이 더 나은지를 실제로 계산해서 표시한다.

  사진과 주변 환경은 글자가 아니라 이미지·태그라서 여기서 만들지 않고 화면에서 직접 그린다.
  (이 파일은 "글자로 표시되는 행"만 담당한다)

  승자 판정 규칙은 매물 비교 페이지(ComparePage.tsx)의 pickWinnerIndex 와 같은 방식이다.
*/

import type { HomeCompareItem } from './Home';
import { formatManwon } from '../utils/propertyPrice';

export type HomeCompareRow = {
    label: string;
    // 매물 순서대로의 표시 문자열
    values: string[];
    // 강조할 칸의 인덱스. 승자를 가리지 않는 행(정보성)이거나 값이 같으면 null
    winnerIndex: number | null;
};

// 값이 작을수록 좋은지(lower), 클수록 좋은지(higher)에 따라 이긴 칸의 인덱스를 돌려준다.
// 모두 같은 값이면 굳이 한쪽을 치켜세우지 않고 null 을 돌려준다.
function pickWinnerIndex(values: number[], direction: 'lower' | 'higher'): number | null {
    if (values.length === 0) return null;

    let winner = 0;
    for (let i = 1; i < values.length; i += 1) {
        const better = direction === 'lower' ? values[i] < values[winner] : values[i] > values[winner];
        if (better) winner = i;
    }

    // 전부 동점이면 승자 표시를 하지 않는다
    if (values.every((v) => v === values[winner])) return null;

    return winner;
}

// 시세 차이 = 호가 - AI 적정가.
// 음수면 적정가보다 싸게 나왔다는 뜻이라 사는 사람에게 유리하다. 그래서 작을수록 좋다.
function diffLabel(diff: number): string {
    if (diff === 0) return '시세와 같음';

    const abs = formatManwon(Math.abs(diff));
    return diff < 0 ? `${abs} 낮음` : `${abs} 높음`;
}

export function buildCompareRows(items: HomeCompareItem[]): HomeCompareRow[] {
    const prices = items.map((item) => item.price);
    const aiPrices = items.map((item) => item.aiPrice);
    const diffs = items.map((item) => item.price - item.aiPrice);
    const areas = items.map((item) => item.area);
    const stations = items.map((item) => item.stationMinutes);
    const fees = items.map((item) => item.maintenanceCost);
    const scores = items.map((item) => item.aiScore);

    return [
        {
            label: '금액',
            values: items.map((item) => `${item.dealTypeLabel} ${formatManwon(item.price)}`),
            winnerIndex: pickWinnerIndex(prices, 'lower'),
        },
        {
            // AI 가 계산한 적정가 자체는 좋고 나쁨이 없는 참고값이라 승자를 가리지 않는다
            label: 'AI 시세',
            values: aiPrices.map(formatManwon),
            winnerIndex: null,
        },
        {
            label: '시세 차이',
            values: diffs.map(diffLabel),
            winnerIndex: pickWinnerIndex(diffs, 'lower'),
        },
        {
            label: '면적',
            values: areas.map((area) => `${area}㎡`),
            winnerIndex: pickWinnerIndex(areas, 'higher'),
        },
        {
            label: '역 거리',
            values: stations.map((minutes) => `도보 ${minutes}분`),
            winnerIndex: pickWinnerIndex(stations, 'lower'),
        },
        {
            label: '관리비',
            values: fees.map(formatManwon),
            winnerIndex: pickWinnerIndex(fees, 'lower'),
        },
        {
            label: 'AI 추천 점수',
            values: scores.map((score) => `${score}점`),
            winnerIndex: pickWinnerIndex(scores, 'higher'),
        },
    ];
}
