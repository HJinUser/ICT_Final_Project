import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import customAxios from "../api/axiosInstance";
import type { PropertyResponse } from "../types/Property";
import "../styles/ComparePage.css";
import { DEAL_TYPE_LABELS } from "../utils/propertyPrice";

// 거래유형별 배지 색. ListingsPage.tsx 와 동일한 매핑을 쓴다(매매=초록/전세=보라/월세=주황).
const DEAL_TYPE_BADGE: Record<string, string> = {
    SALE: "green",
    JEONSE: "purple",
    MONTHLY: "orange",
};

function pickWinnerIndex(
    values: (number | null)[],
    direction: "lower" | "higher"
): number | null {
    // 이번 페이지는 정확히 2개 비교만 한다.
    if (values.length !== 2) return null;

    const first = values[0];
    const second = values[1];

    // 둘 중 하나라도 데이터가 없으면 승자를 표시하지 않는다.
    if (first === null || second === null) return null;

    // 같은 값이면 승자를 표시하지 않는다.
    if (first === second) return null;

    if (direction === "lower") {
        return first < second ? 0 : 1;
    }

    return first > second ? 0 : 1;
}

function formatMoney(value: number): string {
    return `${value.toLocaleString()}만 원`;
}

function formatSignedMoney(value: number): string {
    const sign = value > 0 ? "+" : "";
    return `${sign}${value.toLocaleString()}만 원`;
}

// 매매/전세는 한 개 가격으로 비교할 수 있다.
// 월세는 보증금과 월세 두 개가 있으므로 하나의 숫자로 합치지 않는다.
function getActualComparablePrice(
    property: PropertyResponse
): number | null {
    if (property.dealType === "SALE") {
        return property.price;
    }

    if (property.dealType === "JEONSE") {
        return property.deposit;
    }

    return null;
}

function getAiComparablePrice(
    property: PropertyResponse
): number | null {
    if (property.dealType === "SALE") {
        return property.aiPrice;
    }

    if (property.dealType === "JEONSE") {
        return property.aiDeposit;
    }

    return null;
}

function formatActualPrice(property: PropertyResponse): string {
    if (property.dealType === "SALE") {
        return property.price !== null
            ? formatMoney(property.price)
            : "정보 없음";
    }

    if (property.dealType === "JEONSE") {
        return property.deposit !== null
            ? formatMoney(property.deposit)
            : "정보 없음";
    }

    if (
        property.monthlyDeposit === null ||
        property.monthlyRent === null
    ) {
        return "정보 없음";
    }

    return `보증금 ${formatMoney(property.monthlyDeposit)} / 월세 ${formatMoney(
        property.monthlyRent
    )}`;
}

function formatAiPrice(property: PropertyResponse): string {
    if (property.dealType === "SALE") {
        return property.aiPrice !== null
            ? formatMoney(property.aiPrice)
            : "분석 준비 중";
    }

    if (property.dealType === "JEONSE") {
        return property.aiDeposit !== null
            ? formatMoney(property.aiDeposit)
            : "분석 준비 중";
    }

    if (
        property.aiMonthlyDeposit === null ||
        property.aiMonthlyRent === null
    ) {
        return "분석 준비 중";
    }

    return `보증금 ${formatMoney(
        property.aiMonthlyDeposit
    )} / 월세 ${formatMoney(property.aiMonthlyRent)}`;
}

// 시세 차이 = 실제 등록 금액 - AI 예상 적정가
// 음수면 실제 등록 금액이 AI 예상가보다 저렴하다.
function formatPriceDifference(property: PropertyResponse): string {
    if (property.dealType === "SALE") {
        if (property.price === null || property.aiPrice === null) {
            return "분석 준비 중";
        }

        return formatSignedMoney(property.price - property.aiPrice);
    }

    if (property.dealType === "JEONSE") {
        if (property.deposit === null || property.aiDeposit === null) {
            return "분석 준비 중";
        }

        return formatSignedMoney(property.deposit - property.aiDeposit);
    }

    if (
        property.monthlyDeposit === null ||
        property.monthlyRent === null ||
        property.aiMonthlyDeposit === null ||
        property.aiMonthlyRent === null
    ) {
        return "분석 준비 중";
    }

    const depositDiff =
        property.monthlyDeposit - property.aiMonthlyDeposit;
    const rentDiff =
        property.monthlyRent - property.aiMonthlyRent;

    return `보증금 ${formatSignedMoney(
        depositDiff
    )} / 월세 ${formatSignedMoney(rentDiff)}`;
}

// 비교 항목별 라벨. AI 비교 요약 문장을 만들 때도 재사용한다.
const CATEGORY_LABELS: Record<string, string> = {
    price: "금액",
    priceDiff: "시세 대비 합리적인 가격",
    area: "면적",
    station: "교통 편의",
    fee: "관리비",
    aiScore: "AI 추천 점수",
};

function ComparePage() {
    const [searchParams] = useSearchParams();
    const idsParam = searchParams.get("ids");

    const [properties, setProperties] = useState<PropertyResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const fetchCompare = async () => {
            setLoading(true);
            setError("");
            setProperties([]);

            if (!idsParam) {
                setError("관심목록에서 비교할 매물 2개를 선택해 주세요.");
                setLoading(false);
                return;
            }

            const idStrings = idsParam
                .split(",")
                .map((value) => value.trim());

            if (idStrings.length !== 2) {
                setError("비교할 매물은 정확히 2개여야 합니다.");
                setLoading(false);
                return;
            }

            const firstId = Number(idStrings[0]);
            const secondId = Number(idStrings[1]);

            if (
                !Number.isInteger(firstId) ||
                !Number.isInteger(secondId) ||
                firstId <= 0 ||
                secondId <= 0
            ) {
                setError("매물 id 형식이 올바르지 않습니다.");
                setLoading(false);
                return;
            }

            if (firstId === secondId) {
                setError("서로 다른 두 매물을 선택해야 합니다.");
                setLoading(false);
                return;
            }

            try {
                const response = await customAxios.get<PropertyResponse[]>(
                    "/property/compare",
                    {
                        params: {
                            ids: `${firstId},${secondId}`,
                        },
                    }
                );

                if (response.data.length !== 2) {
                    setError("선택한 매물 중 조회할 수 없는 매물이 있습니다.");
                    return;
                }

                if (
                    response.data[0].dealType !==
                    response.data[1].dealType
                ) {
                    setError("같은 거래유형의 매물끼리만 비교할 수 있습니다.");
                    return;
                }

                setProperties(response.data);
            } catch (error) {
                console.error("매물 비교 조회 실패:", error);
                setError("매물 비교 정보를 불러오지 못했습니다.");
            } finally {
                setLoading(false);
            }
        };

        fetchCompare();
    }, [idsParam]);

    if (loading) {
        return (
            <main>
                <section className="section">
                    <div className="wrap">
                        <p className="muted">불러오는 중...</p>
                    </div>
                </section>
            </main>
        );
    }

    if (error) {
        return (
            <main>
                <section className="section">
                    <div className="wrap">
                        <div className="soft" style={{ maxWidth: 480 }}>
                            <p>{error}</p>
                        </div>
                        <Link
                            to="/favorites"
                            className="outline-btn"
                            style={{ marginTop: 16, display: "inline-flex" }}
                        >
                            관심목록으로 돌아가기
                        </Link>
                    </div>
                </section>
            </main>
        );
    }

    if (properties.length !== 2) {
        return (
            <main>
                <section className="section">
                    <div className="wrap">
                        <div className="soft" style={{ maxWidth: 480 }}>
                            <p>관심목록에서 비교할 매물 2개를 선택해 주세요.</p>
                        </div>
                        <Link
                            to="/favorites"
                            className="outline-btn"
                            style={{ marginTop: 16, display: "inline-flex" }}
                        >
                            관심목록으로 돌아가기
                        </Link>
                    </div>
                </section>
            </main>
        );
    }

    const dealType = properties[0].dealType;

    const actualPrices = properties.map(getActualComparablePrice);
    const aiPrices = properties.map(getAiComparablePrice);

    const priceDiffs = actualPrices.map((actualPrice, index) => {
        const aiPrice = aiPrices[index];

        if (actualPrice === null || aiPrice === null) {
            return null;
        }

        return actualPrice - aiPrice;
    });

    const areas = properties.map((property) => property.area);
    const maintenanceFees = properties.map(
        (property) => property.maintenanceFee
    );
    const stationDistances = properties.map(
        (property) => property.stationDistance
    );
    const aiRecommendScores = properties.map(
        (property) => property.aiRecommendScore
    );

    // 월세는 보증금과 월세 두 숫자가 있으므로
    // 하나의 금액만 보고 승자를 만들지 않는다.
    const priceWinner =
        dealType === "MONTHLY"
            ? null
            : pickWinnerIndex(actualPrices, "lower");

    const priceDiffWinner =
        dealType === "MONTHLY"
            ? null
            : pickWinnerIndex(priceDiffs, "lower");

    const areaWinner = pickWinnerIndex(areas, "higher");
    const feeWinner = pickWinnerIndex(maintenanceFees, "lower");
    const stationWinner = pickWinnerIndex(stationDistances, "lower");
    const aiScoreWinner = pickWinnerIndex(aiRecommendScores, "higher");

    // AI 비교 요약: 이미 계산한 승자 인덱스들을 모아서 "이 매물이 어떤 항목에서 유리한지" 문장으로 묶는다.
    // 새로운 API 호출 없이 화면에 이미 있는 계산 결과만 재사용한다.
    const categoryWinners: { key: string; winner: number | null }[] = [
        { key: "price", winner: priceWinner },
        { key: "priceDiff", winner: priceDiffWinner },
        { key: "area", winner: areaWinner },
        { key: "station", winner: stationWinner },
        { key: "fee", winner: feeWinner },
        { key: "aiScore", winner: aiScoreWinner },
    ];

    const winningLabelsByIndex: string[][] = [[], []];
    categoryWinners.forEach(({ key, winner }) => {
        if (winner === 0 || winner === 1) {
            winningLabelsByIndex[winner].push(CATEGORY_LABELS[key]);
        }
    });

    const summarySentences = winningLabelsByIndex
        .map((labels, index) =>
            labels.length > 0
                ? `${labels.join("·")}은(는) ${properties[index].name}이(가) 유리합니다.`
                : null
        )
        .filter((sentence): sentence is string => sentence !== null);

    return (
        <main>
            <section className="page-hero">
                <div className="wrap">
                    <div>
                        <div className="eyebrow">Compare</div>
                        <h1>매물 비교</h1>
                        <p>
                            관심 있는 매물 2개를 나란히 놓고 가격, 면적, 교통, 환경,
                            AI 시세를 비교합니다.
                        </p>
                    </div>
                    <div className="hero-stat">
                        <span className="mono dim">현재 비교</span>
                        <strong>2개</strong>
                        <span className="xs dim">2개까지 선택</span>
                    </div>
                </div>
            </section>

            <section className="section">
                <div className="wrap">
                    <div className="table-wrap">
                        <table className="compare-table">
                            <thead>
                            <tr>
                                <th>비교 항목</th>

                                {properties.map((property) => (
                                    <th key={property.id}>
                                            <span
                                                className={`status ${
                                                    DEAL_TYPE_BADGE[property.dealType] ?? "gray"
                                                }`}
                                            >
                                                {DEAL_TYPE_LABELS[property.dealType]}
                                            </span>
                                        <div style={{ marginTop: 6 }}>{property.name}</div>
                                    </th>
                                ))}
                            </tr>
                            </thead>

                            <tbody>
                            <tr>
                                <td>사진</td>

                                {properties.map((property) => (
                                    <td key={property.id}>
                                        {property.images[0] ? (
                                            <div
                                                className="thumb"
                                                style={{
                                                    backgroundImage: `url('${property.images[0].url}')`,
                                                }}
                                            />
                                        ) : (
                                            <div className="thumb thumb-empty">사진 없음</div>
                                        )}
                                    </td>
                                ))}
                            </tr>

                            <tr>
                                <td>금액</td>

                                {properties.map((property, index) => (
                                    <td
                                        key={property.id}
                                        className={index === priceWinner ? "winner" : ""}
                                    >
                                            <span className="num">
                                                {formatActualPrice(property)}
                                            </span>
                                        {index === priceWinner && " ✓"}
                                    </td>
                                ))}
                            </tr>

                            <tr>
                                <td>AI 예상 시세</td>

                                {properties.map((property) => (
                                    <td key={property.id} className="num">
                                        {formatAiPrice(property)}
                                    </td>
                                ))}
                            </tr>

                            <tr>
                                <td>시세 차이</td>

                                {properties.map((property, index) => (
                                    <td
                                        key={property.id}
                                        className={index === priceDiffWinner ? "winner" : ""}
                                    >
                                            <span className="num">
                                                {formatPriceDifference(property)}
                                            </span>
                                        {index === priceDiffWinner && " ✓"}
                                    </td>
                                ))}
                            </tr>

                            <tr>
                                <td>면적</td>

                                {properties.map((property, index) => (
                                    <td
                                        key={property.id}
                                        className={index === areaWinner ? "winner" : ""}
                                    >
                                        <span className="num">{property.area}㎡</span>
                                        {index === areaWinner && " ✓"}
                                    </td>
                                ))}
                            </tr>

                            <tr>
                                <td>역 거리</td>

                                {properties.map((property, index) => (
                                    <td
                                        key={property.id}
                                        className={index === stationWinner ? "winner" : ""}
                                    >
                                            <span className="num">
                                                {property.stationDistance !== null
                                                    ? `${Math.round(
                                                        property.stationDistance
                                                    ).toLocaleString()}m`
                                                    : "정보 없음"}
                                            </span>
                                        {index === stationWinner && " ✓"}
                                    </td>
                                ))}
                            </tr>

                            <tr>
                                <td>관리비</td>

                                {properties.map((property, index) => (
                                    <td
                                        key={property.id}
                                        className={index === feeWinner ? "winner" : ""}
                                    >
                                            <span className="num">
                                                {property.maintenanceFee.toLocaleString()}만 원
                                            </span>
                                        {index === feeWinner && " ✓"}
                                    </td>
                                ))}
                            </tr>

                            <tr>
                                <td>주변 환경</td>

                                {properties.map((property) => (
                                    <td key={property.id}>
                                        {property.tags.length > 0 ? (
                                            <div className="tags">
                                                {property.tags.slice(0, 5).map((tag) => (
                                                    <span className="tag" key={tag.id}>
                                                            {tag.name}
                                                        </span>
                                                ))}
                                            </div>
                                        ) : (
                                            "정보 없음"
                                        )}
                                    </td>
                                ))}
                            </tr>

                            <tr>
                                <td>AI 추천 점수</td>

                                {properties.map((property, index) => (
                                    <td
                                        key={property.id}
                                        className={
                                            index === aiScoreWinner ? "winner num" : "num"
                                        }
                                    >
                                        {property.aiRecommendScore !== null
                                            ? `${property.aiRecommendScore.toLocaleString()}점`
                                            : "분석 준비 중"}
                                        {index === aiScoreWinner && " ✓"}
                                    </td>
                                ))}
                            </tr>

                            <tr>
                                <td></td>

                                {properties.map((property, index) => (
                                    <td key={property.id}>
                                        <Link
                                            to={`/property/${property.id}`}
                                            className={
                                                index === 0 ? "solid-btn" : "outline-btn"
                                            }
                                        >
                                            상세 보기
                                        </Link>
                                    </td>
                                ))}
                            </tr>
                            </tbody>
                        </table>
                    </div>

                    {summarySentences.length > 0 && (
                        <div className="ai-band" style={{ marginTop: 20 }}>
                            <strong>AI 비교 요약</strong>
                            <p style={{ marginTop: 5 }}>{summarySentences.join(" ")}</p>
                        </div>
                    )}

                    <div className="row" style={{ justifyContent: "center", marginTop: 26 }}>
                        <Link to="/favorites" className="ghost-btn">
                            관심목록으로 돌아가기
                        </Link>
                        <Link to="/map" className="solid-btn">
                            다른 매물 추가
                        </Link>
                    </div>
                </div>
            </section>
        </main>
    );
}

export default ComparePage;
