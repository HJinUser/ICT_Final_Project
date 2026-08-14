import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Container, Table, Badge, Alert } from "react-bootstrap";
import customAxios from "../api/axiosInstance";
import type { PropertyResponse } from "../types/Property";
import "../styles/ComparePage.css";
import { DEAL_TYPE_LABELS } from "../utils/propertyPrice";

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
        return <Container className="mt-5">불러오는 중...</Container>;
    }

    if (error) {
        return (
            <Container className="mt-5">
                <Alert variant="warning">{error}</Alert>
                <Link to="/favorites" className="btn btn-outline-primary">
                    관심목록으로 돌아가기
                </Link>
            </Container>
        );
    }

    if (properties.length !== 2) {
        return (
            <Container className="mt-5">
                <Alert variant="secondary">
                    관심목록에서 비교할 매물 2개를 선택해 주세요.
                </Alert>
                <Link to="/favorites" className="btn btn-outline-primary">
                    관심목록으로 돌아가기
                </Link>
            </Container>
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

    return (
        <Container className="mt-4 mb-5">
            <div className="d-flex justify-content-between align-items-start gap-3 flex-wrap">
                <div>
                    <div className="text-muted small">Compare</div>
                    <h1>매물 비교</h1>
                    <p className="text-muted mb-0">
                        같은 거래유형의 관심매물 2개를 비교합니다.
                    </p>
                </div>

                <Link
                    to="/favorites"
                    className="btn btn-outline-primary"
                >
                    ← 관심목록으로 돌아가기
                </Link>
            </div>

            <Table bordered responsive className="compare-table mt-4">
                <thead>
                    <tr>
                        <th className="compare-label-column">
                            비교 항목
                        </th>

                        {properties.map((property) => (
                            <th key={property.id}>
                                <Badge bg="secondary" className="mb-2">
                                    {DEAL_TYPE_LABELS[property.dealType]}
                                </Badge>
                                <div>{property.name}</div>
                            </th>
                        ))}
                    </tr>
                </thead>

                <tbody>
                    <tr>
                        <td className="compare-row-label">사진</td>

                        {properties.map((property) => (
                            <td key={property.id}>
                                {property.images[0] ? (
                                    <img
                                        src={property.images[0].url}
                                        alt={property.name}
                                        className="compare-thumb"
                                    />
                                ) : (
                                    <div className="compare-thumb compare-thumb--empty">
                                        사진 없음
                                    </div>
                                )}
                            </td>
                        ))}
                    </tr>

                    <tr>
                        <td className="compare-row-label">금액</td>

                        {properties.map((property, index) => (
                            <td
                                key={property.id}
                                className={
                                    index === priceWinner
                                        ? "compare-winner"
                                        : ""
                                }
                            >
                                {formatActualPrice(property)}
                                {index === priceWinner && (
                                    <span className="winner-check"> ✓</span>
                                )}
                            </td>
                        ))}
                    </tr>

                    <tr>
                        <td className="compare-row-label">
                            AI 예상 시세
                        </td>

                        {properties.map((property) => (
                            <td key={property.id}>
                                {formatAiPrice(property)}
                            </td>
                        ))}
                    </tr>

                    <tr>
                        <td className="compare-row-label">
                            시세 차이
                        </td>

                        {properties.map((property, index) => (
                            <td
                                key={property.id}
                                className={
                                    index === priceDiffWinner
                                        ? "compare-winner"
                                        : ""
                                }
                            >
                                {formatPriceDifference(property)}
                                {index === priceDiffWinner && (
                                    <span className="winner-check"> ✓</span>
                                )}
                            </td>
                        ))}
                    </tr>

                    <tr>
                        <td className="compare-row-label">면적</td>

                        {properties.map((property, index) => (
                            <td
                                key={property.id}
                                className={
                                    index === areaWinner
                                        ? "compare-winner"
                                        : ""
                                }
                            >
                                {property.area}㎡
                                {index === areaWinner && (
                                    <span className="winner-check"> ✓</span>
                                )}
                            </td>
                        ))}
                    </tr>

                    <tr>
                        <td className="compare-row-label">역 거리</td>

                        {properties.map((property, index) => (
                            <td
                                key={property.id}
                                className={
                                    index === stationWinner
                                        ? "compare-winner"
                                        : ""
                                }
                            >
                                {property.stationDistance !== null
                                    ? `${Math.round(
                                        property.stationDistance
                                    ).toLocaleString()}m`
                                    : "정보 없음"}

                                {index === stationWinner && (
                                    <span className="winner-check"> ✓</span>
                                )}
                            </td>
                        ))}
                    </tr>

                    <tr>
                        <td className="compare-row-label">관리비</td>

                        {properties.map((property, index) => (
                            <td
                                key={property.id}
                                className={
                                    index === feeWinner
                                        ? "compare-winner"
                                        : ""
                                }
                            >
                                {property.maintenanceFee.toLocaleString()}만 원
                                {index === feeWinner && (
                                    <span className="winner-check"> ✓</span>
                                )}
                            </td>
                        ))}
                    </tr>

                    <tr>
                        <td className="compare-row-label">주변 환경</td>

                        {properties.map((property) => (
                            <td key={property.id}>
                                {property.tags.length > 0
                                    ? property.tags
                                        .slice(0, 5)
                                        .map((tag) => (
                                            <Badge
                                                key={tag.id}
                                                bg="light"
                                                text="dark"
                                                className="me-1 mb-1"
                                            >
                                                {tag.name}
                                            </Badge>
                                        ))
                                    : "정보 없음"}
                            </td>
                        ))}
                    </tr>

                    <tr>
                        <td className="compare-row-label">
                            AI 추천 점수
                        </td>

                        {properties.map((property, index) => (
                            <td
                                key={property.id}
                                className={
                                    index === aiScoreWinner
                                        ? "compare-winner"
                                        : ""
                                }
                            >
                                {property.aiRecommendScore !== null
                                    ? `${property.aiRecommendScore.toLocaleString()}점`
                                    : "분석 준비 중"}

                                {index === aiScoreWinner && (
                                    <span className="winner-check"> ✓</span>
                                )}
                            </td>
                        ))}
                    </tr>

                    <tr>
                        <td className="compare-row-label">상세 보기</td>

                        {properties.map((property) => (
                            <td key={property.id}>
                                <Link
                                    to={`/property/${property.id}`}
                                    className="btn btn-primary btn-sm w-100"
                                >
                                    상세 보기
                                </Link>
                            </td>
                        ))}
                    </tr>
                </tbody>
            </Table>

            <Alert variant="light" className="mt-3">
                AI 예상 시세와 AI 추천 점수는 아직 DB에 분석 결과가 없는 경우
                <strong> 분석 준비 중</strong>으로 표시됩니다.
            </Alert>
        </Container>
    );
}

export default ComparePage;