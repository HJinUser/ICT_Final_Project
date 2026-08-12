import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Container, Table, Badge, Alert } from "react-bootstrap";
import customAxios from "../api/axiosInstance";
import type { PropertyResponse } from "../types/Property";
import "../components/ComparePage.css";
import { getPrimaryPrice, getPrimaryAiPrice, formatPrice, DEAL_TYPE_LABELS } from "../utils/propertyPrice";

// 여러 매물 중 어떤 값이 "더 좋은지" 골라서 그 인덱스를 돌려주는 헬퍼.
// direction="lower"면 값이 작을수록 좋음(가격/관리비/역거리), "higher"면 값이 클수록 좋음(면적).
// null인 매물은 비교에서 제외하고, 전부 값이 같으면 승자를 표시하지 않는다.
function pickWinnerIndex(values: (number | null)[], direction: "lower" | "higher"): number | null {
    let winnerIndex: number | null = null;
    let winnerValue: number | null = null;

    values.forEach((value, index) => {
        if (value === null) return;
        if (
            winnerValue === null ||
            (direction === "lower" && value < winnerValue) ||
            (direction === "higher" && value > winnerValue)
        ) {
            winnerValue = value;
            winnerIndex = index;
        }
    });

    if (winnerIndex !== null && values.every((v) => v === values[winnerIndex as number])) {
        return null;
    }
    return winnerIndex;
}

// 매물 비교 페이지. 쿼리스트링 ?ids=1,2,3 로 들어온 매물들을 백엔드 GET /property/compare 로 한 번에 받아서
// 표 형태로 나란히 비교한다. 목업(compare.html)은 2개 고정이지만, 백엔드가 이미 여러 개를 받게 돼 있어서
// 여기서는 개수 제한을 두지 않고 넘어온 만큼 컬럼을 그린다.
function ComparePage() {
    const [searchParams] = useSearchParams();
    const idsParam = searchParams.get("ids"); // "1,2" 형태 문자열

    const [properties, setProperties] = useState<PropertyResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!idsParam) {
            setLoading(false);
            return;
        }

        const fetchCompare = async () => {
            setLoading(true);
            try {
                // 백엔드 GET /property/compare?ids=1,2,3 는 쉼표 구분 문자열을 그대로 파라미터로 받는다.
                const response = await customAxios.get<PropertyResponse[]>(
                    `/property/compare`,
                    { params: { ids: idsParam } }
                );
                setProperties(response.data);
            } catch (err) {
                console.error(err);
                setError("매물 비교 정보를 불러오지 못했습니다.");
            } finally {
                setLoading(false);
            }
        };
        fetchCompare();
    }, [idsParam]);

    if (loading) return <Container className="mt-5">불러오는 중...</Container>;

    if (!idsParam || properties.length === 0) {
        return (
            <Container className="mt-5">
                <Alert variant="secondary">
                    비교할 매물이 없습니다. 매물 목록에서 비교할 매물을 먼저 선택해 주세요.
                </Alert>
                <Link to="/" className="btn btn-outline-primary">매물 목록으로</Link>
            </Container>
        );
    }

    // 행마다 쓸 값들을 미리 뽑아서 승자 계산에 재사용한다.
    const prices = properties.map(getPrimaryPrice);
    // 시세 차이 = AI 시세 - 실제 가격. 음수(마이너스)일수록 시세보다 싸게 나온 매물이라 유리 → lower가 승자.
    const priceDiffs = properties.map((p, i) => {
        const aiPrice = getPrimaryAiPrice(p);
        return aiPrice != null ? aiPrice - prices[i] : null;
    });
    const areas = properties.map((p) => p.area);
    const maintenanceFees = properties.map((p) => p.maintenanceFee);
    const stationDistances = properties.map((p) => p.stationDistance);

    const priceWinner = pickWinnerIndex(prices, "lower");
    const priceDiffWinner = pickWinnerIndex(priceDiffs, "lower");
    const areaWinner = pickWinnerIndex(areas, "higher");
    const feeWinner = pickWinnerIndex(maintenanceFees, "lower");
    const stationWinner = pickWinnerIndex(stationDistances, "lower");

    return (
        <Container className="mt-4 mb-5">
            <div className="text-muted small">Compare</div>
            <h1>매물 비교</h1>
            <p className="text-muted">
                관심 있는 매물 {properties.length}개를 나란히 놓고 가격, 면적, 교통, 환경, AI 시세를 비교합니다.
            </p>

            {error && <Alert variant="danger">{error}</Alert>}

            <Table bordered responsive className="compare-table mt-4">
                <thead>
                <tr>
                    <th style={{ width: 140 }}>비교 항목</th>
                    {properties.map((p) => (
                        <th key={p.id}>{p.name}</th>
                    ))}
                </tr>
                </thead>
                <tbody>
                <tr>
                    <td>사진</td>
                    {properties.map((p) => (
                        <td key={p.id}>
                            {p.images[0] ? (
                                <img src={p.images[0].url} alt={p.name} className="compare-thumb" />
                            ) : (
                                <div className="compare-thumb compare-thumb--empty">사진 없음</div>
                            )}
                        </td>
                    ))}
                </tr>

                <tr>
                    <td>가격</td>
                    {properties.map((p, i) => (
                        <td key={p.id} className={i === priceWinner ? "compare-winner" : ""}>
                            <Badge bg="secondary" className="me-1">{DEAL_TYPE_LABELS[p.dealType]}</Badge>
                            {formatPrice(p)}{i === priceWinner && " ✓"}
                        </td>
                    ))}
                </tr>

                <tr>
                    <td>AI 시세</td>
                    {properties.map((p) => (
                        <td key={p.id}>{getPrimaryAiPrice(p) != null ? getPrimaryAiPrice(p)!.toLocaleString() : "정보 없음"}</td>
                    ))}
                </tr>

                <tr>
                    <td>시세 차이</td>
                    {properties.map((p, i) => (
                        <td key={p.id} className={i === priceDiffWinner ? "compare-winner" : ""}>
                            {priceDiffs[i] != null
                                ? `${priceDiffs[i]! >= 0 ? "+" : ""}${priceDiffs[i]!.toLocaleString()}`
                                : "정보 없음"}
                            {i === priceDiffWinner && " ✓"}
                        </td>
                    ))}
                </tr>

                <tr>
                    <td>면적</td>
                    {properties.map((p, i) => (
                        <td key={p.id} className={i === areaWinner ? "compare-winner" : ""}>
                            {p.area}㎡{i === areaWinner && " ✓"}
                        </td>
                    ))}
                </tr>

                <tr>
                    <td>역 거리</td>
                    {properties.map((p, i) => (
                        // TODO: Python 지오코딩/거리 계산 연동 전까지는 거의 항상 null(정보 없음)로 표시됨
                        <td key={p.id} className={i === stationWinner ? "compare-winner" : ""}>
                            {p.stationDistance != null ? `${p.stationDistance}m` : "정보 없음"}
                            {i === stationWinner && " ✓"}
                        </td>
                    ))}
                </tr>

                <tr>
                    <td>관리비</td>
                    {properties.map((p, i) => (
                        <td key={p.id} className={i === feeWinner ? "compare-winner" : ""}>
                            {p.maintenanceFee}만 원{i === feeWinner && " ✓"}
                        </td>
                    ))}
                </tr>

                <tr>
                    <td>주변환경</td>
                    {properties.map((p) => (
                        <td key={p.id}>
                            {p.tags.map((tag) => (
                                <Badge key={tag.id} bg="light" text="dark" className="me-1 mb-1">{tag.name}</Badge>
                            ))}
                        </td>
                    ))}
                </tr>

                <tr>
                    <td />
                    {properties.map((p) => (
                        <td key={p.id}>
                            <Link to={`/property/${p.id}`} className="btn btn-primary btn-sm w-100">
                                상세 보기
                            </Link>
                        </td>
                    ))}
                </tr>
                </tbody>
            </Table>
        </Container>
    );
}

export default ComparePage;