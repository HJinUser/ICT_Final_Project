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

import type { PropertyResponse } from './Property';
import { formatManwon } from '../utils/propertyPrice';

export type HomeCompareRow = {
    label: string;
    // 매물 순서대로의 표시 문자열
    values: string[];
    // 강조할 칸의 인덱스. 승자를 가리지 않는 행(정보성)이거나 값이 같으면 null
    winnerIndex: number | null;
};

// 값이 작을수록 좋은지(lower), 클수록 좋은지(higher)에 따라 이긴 칸의 인덱스를 돌려준다.
// 값이 없는(null) 매물이 하나라도 있으면 비교할 근거가 없으므로 승자를 표시하지 않는다.
// 모두 같은 값이면 굳이 한쪽을 치켜세우지 않고 null 을 돌려준다.
function pickWinnerIndex(values: (number | null)[], direction: 'lower' | 'higher'): number | null {
    if (values.length === 0 || values.some((value) => value === null)) return null;

    const numbers = values as number[];
    let winner = 0;
    for (let i = 1; i < numbers.length; i += 1) {
        const better = direction === 'lower' ? numbers[i] < numbers[winner] : numbers[i] > numbers[winner];
        if (better) winner = i;
    }

    // 전부 동점이면 승자 표시를 하지 않는다
    if (numbers.every((v) => v === numbers[winner])) return null;

    return winner;
}

const NO_DATA = '정보 없음';

function formatNullableManwon(value: number | null): string {
    return value === null ? NO_DATA : formatManwon(value);
}

// 시세 차이 = 호가 - AI 적정가.
// 음수면 적정가보다 싸게 나왔다는 뜻이라 사는 사람에게 유리하다. 그래서 작을수록 좋다.
function diffLabel(actual: number | null, ai: number | null): string {
    if (actual === null || ai === null) return NO_DATA;

    const diff = actual - ai;
    if (diff === 0) return '시세와 같음';

    const abs = formatManwon(Math.abs(diff));
    return diff < 0 ? `${abs} 낮음` : `${abs} 높음`;
}

function diffValue(actual: number | null, ai: number | null): number | null {
    if (actual === null || ai === null) return null;
    return actual - ai;
}

// 월세 전용: 보증금·월세 두 숫자를 "보증금 X / 월세 Y" 한 줄로 합친다.
// 둘 중 하나라도 없으면(ComparePage.tsx와 동일하게) 통째로 "정보 없음"으로 표시한다.
function formatCombinedAmount(deposit: number | null, rent: number | null): string {
    if (deposit === null || rent === null) return NO_DATA;
    return `보증금 ${formatManwon(deposit)} / 월세 ${formatManwon(rent)}`;
}

// 월세 전용: 보증금 시세차이·월세 시세차이를 "보증금 ~낮음 / 월세 ~높음" 한 줄로 합친다.
function combinedDiffLabel(
    depositActual: number | null, depositAi: number | null,
    rentActual: number | null, rentAi: number | null
): string {
    if (depositActual === null || depositAi === null || rentActual === null || rentAi === null) {
        return NO_DATA;
    }
    return `보증금 ${diffLabel(depositActual, depositAi)} / 월세 ${diffLabel(rentActual, rentAi)}`;
}

// items는 항상 같은 거래유형 두 건이다 (HomePage.tsx가 거래유형 탭별로 걸러서 넘긴다)
export function buildCompareRows(items: PropertyResponse[]): HomeCompareRow[] {
    if (items.length !== 2) return [];

    const dealType = items[0].dealType;

    const areas = items.map((item) => item.area);
    const stations = items.map((item) => item.stationDistance);
    const fees = items.map((item) => item.maintenanceFee);

    const commonRows: HomeCompareRow[] = [
        {
            label: '면적',
            values: areas.map((area) => `${area}㎡`),
            winnerIndex: pickWinnerIndex(areas, 'higher'),
        },
        {
            label: '역 거리',
            values: stations.map((meters) => (meters === null ? NO_DATA : `${Math.round(meters)}m`)),
            winnerIndex: pickWinnerIndex(stations, 'lower'),
        },
        {
            label: '관리비',
            values: fees.map(formatManwon),
            winnerIndex: pickWinnerIndex(fees, 'lower'),
        },
    ];

    if (dealType === 'MONTHLY') {
        const convertedAmounts = items.map((item) => item.comparablePrice);

        return [
            {
                label: '금액',
                values: items.map((item) => formatCombinedAmount(item.monthlyDeposit, item.monthlyRent)),
                // 보증금+월세를 하나로 합칠 공식이 없어 여기선 승자를 매기지 않는다 (ComparePage.tsx와 동일).
                // 종합 판단은 아래 "환산 금액" 행에서 한다.
                winnerIndex: null,
            },
            {
                label: 'AI 예상 시세',
                values: items.map((item) => formatCombinedAmount(item.aiMonthlyDeposit, item.aiMonthlyRent)),
                winnerIndex: null,
            },
            {
                label: '시세 차이',
                values: items.map((item) =>
                    combinedDiffLabel(item.monthlyDeposit, item.aiMonthlyDeposit, item.monthlyRent, item.aiMonthlyRent)
                ),
                winnerIndex: null,
            },
            {
                // ComparePage.tsx의 "환산 금액"과 완전히 같은 값(comparablePrice) — 보증금과 월세를
                // 법정 전환율 기준으로 합쳐서, 위 두 항목을 각각 볼 필요 없이 종합적으로도 승자를 매길 수 있게 한다.
                label: '환산 금액',
                values: convertedAmounts.map(formatNullableManwon),
                winnerIndex: pickWinnerIndex(convertedAmounts, 'lower'),
            },
            ...commonRows,
        ];
    }

    // SALE / JEONSE: 대표 금액이 하나뿐이다.
    const actualPrices = items.map((item) => (dealType === 'SALE' ? item.price : item.deposit));
    const aiPrices = items.map((item) => (dealType === 'SALE' ? item.aiPrice : item.aiDeposit));

    return [
        {
            label: '금액',
            values: actualPrices.map(formatNullableManwon),
            winnerIndex: pickWinnerIndex(actualPrices, 'lower'),
        },
        {
            label: 'AI 시세',
            values: aiPrices.map(formatNullableManwon),
            winnerIndex: null,
        },
        {
            label: '시세 차이',
            values: items.map((item, index) => diffLabel(actualPrices[index], aiPrices[index])),
            winnerIndex: pickWinnerIndex(
                actualPrices.map((actual, index) => diffValue(actual, aiPrices[index])),
                'lower'
            ),
        },
        ...commonRows,
    ];
}
