// 매물 가격을 화면에 표시할 때 쓰는 값들을 한곳에 모아 둔 파일
//
// 매물 상세·비교·관심목록·내 매물 관리 화면이 전부 "거래유형에 따라 어느 가격 필드를 보여줄지"를
// 똑같이 판단해야 하기 때문에, 각 화면에 흩어 두면 나중에 로직이 바뀔 때 여러 군데를 고쳐야 한다.

import type { PropertyResponse, DealTypeCode } from "../types/Property";

// 거래유형에 따라 실제 비교 대상이 되는 가격 하나를 뽑아준다 (매매=price, 전세=deposit, 월세=monthlyDeposit)
export const getPrimaryPrice = (property: PropertyResponse): number => {
    if (property.dealType === "SALE") return property.price ?? 0;
    if (property.dealType === "JEONSE") return property.deposit ?? 0;
    return property.monthlyDeposit ?? 0;
};

// 거래유형에 따라 AI 예상가 중 실제로 비교할 값 하나를 뽑아준다. 아직 예측 전이면 null.
export const getPrimaryAiPrice = (property: PropertyResponse): number | null => {
    if (property.dealType === "SALE") return property.aiPrice;
    if (property.dealType === "JEONSE") return property.aiDeposit;
    return property.aiMonthlyDeposit;
};

// 화면에 보여줄 가격 문자열. 월세만 "보증금/월세" 형태로 따로 표시한다.
export const formatPrice = (property: PropertyResponse): string => {
    if (property.dealType === "MONTHLY") {
        return `${(property.monthlyDeposit ?? 0).toLocaleString()}/${(property.monthlyRent ?? 0).toLocaleString()}`;
    }
    return getPrimaryPrice(property).toLocaleString();
};

export const DEAL_TYPE_LABELS: Record<DealTypeCode, string> = {
    SALE: "매매",
    JEONSE: "전세",
    MONTHLY: "월세",
};

// 만원 단위 정수를 "4억 9,000만 원" 형태로 바꾼다.
// 서버가 금액을 만원 단위로 내려주는데, 화면마다 억/만 변환 규칙을 다시 짜면
// 자리수 표기가 서로 어긋나기 쉬워서 여기 한곳에 둔다.
export const formatManwon = (manwon: number): string => {
    if (manwon <= 0) return "0원";

    const eok = Math.floor(manwon / 10_000);
    const rest = manwon % 10_000;

    if (eok === 0) return `${rest.toLocaleString()}만 원`;
    if (rest === 0) return `${eok}억 원`;
    return `${eok}억 ${rest.toLocaleString()}만 원`;
};