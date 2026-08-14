import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {Container, Row, Col, Card, Badge, Button, Alert, Form,} from "react-bootstrap";
import customAxios from "../api/axiosInstance";
import type { PropertyResponse } from "../types/Property";
import "../components/FavoritesPage.css";
import { formatPrice, DEAL_TYPE_LABELS } from "../utils/propertyPrice";

function FavoritesPage() {
    const navigate = useNavigate();

    const [favorites, setFavorites] = useState<PropertyResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // 이번에 비교할 매물 id만 화면 state로 보관한다.
    // DB에 저장할 필요는 없다.
    const [selectedIds, setSelectedIds] = useState<number[]>([]);

    useEffect(() => {
        const fetchFavorites = async () => {
            setLoading(true);
            setError("");

            try {
                const response = await customAxios.get<PropertyResponse[]>(
                    "/property/favorites"
                );
                setFavorites(response.data);
            } catch (error) {
                console.error(error);
                setError("관심매물 목록을 불러오지 못했습니다.");
            } finally {
                setLoading(false);
            }
        };

        fetchFavorites();
    }, []);

    // 첫 번째로 선택한 매물을 찾는다.
    // 두 번째 매물은 이 매물과 거래유형이 같아야 한다.
    const firstSelectedProperty = favorites.find(
        (property) => property.id === selectedIds[0]
    );

    const selectedDealType = firstSelectedProperty?.dealType ?? null;

    const removeFavorite = async (propertyId: number) => {
        try {
            const response = await customAxios.post<{ favorited: boolean }>(
                `/property/${propertyId}/favorite`
            );

            if (!response.data.favorited) {
                setFavorites((prev) =>
                    prev.filter((property) => property.id !== propertyId)
                );

                // 비교 대상으로 선택돼 있던 매물을 찜 해제하면
                // 비교 선택에서도 함께 제거한다.
                setSelectedIds((prev) =>
                    prev.filter((id) => id !== propertyId)
                );
            }
        } catch (error) {
            console.error("관심매물 해제 실패:", error);
            alert("관심매물 해제 중 오류가 발생했습니다.");
        }
    };

    const toggleCompare = (property: PropertyResponse) => {
        const alreadySelected = selectedIds.includes(property.id);

        // 이미 선택한 매물을 다시 누르면 선택 해제
        if (alreadySelected) {
            setSelectedIds((prev) =>
                prev.filter((id) => id !== property.id)
            );
            return;
        }

        // 최대 2개
        if (selectedIds.length >= 2) {
            alert("비교할 매물은 최대 2개까지 선택할 수 있습니다.");
            return;
        }

        // 첫 번째 매물과 거래유형이 다르면 선택 불가
        if (
            selectedDealType !== null &&
            property.dealType !== selectedDealType
        ) {
            alert("같은 거래유형의 매물끼리만 비교할 수 있습니다.");
            return;
        }

        setSelectedIds((prev) => [...prev, property.id]);
    };

    const goToCompare = () => {
        if (selectedIds.length !== 2) {
            alert("비교할 매물 2개를 선택해 주세요.");
            return;
        }

        navigate(`/property/compare?ids=${selectedIds.join(",")}`);
    };

    if (loading) {
        return <Container className="mt-5">불러오는 중...</Container>;
    }

    return (
        <Container className="mt-4 mb-5">
            <div className="text-muted small">Saved Homes</div>
            <h1>관심목록</h1>
            <p className="text-muted">
                찜한 매물 중 같은 거래유형의 매물 2개를 선택해 비교할 수 있습니다.
            </p>

            {error && <Alert variant="danger">{error}</Alert>}

            {favorites.length > 0 && selectedIds.length === 0 && (
                <Alert variant="light" className="compare-guide-alert">
                    비교할 매물 2개를 선택해 주세요.
                </Alert>
            )}

            {selectedIds.length === 1 && selectedDealType !== null && (
                <Alert variant="light" className="compare-guide-alert">
                    {DEAL_TYPE_LABELS[selectedDealType]} 매물 1개를 더 선택해 주세요.
                </Alert>
            )}

            {selectedIds.length === 2 && (
                <Alert variant="success" className="compare-guide-alert">
                    비교할 매물 2개를 모두 선택했습니다.
                </Alert>
            )}

            {favorites.length === 0 ? (
                <Alert variant="secondary" className="mt-4">
                    아직 찜한 매물이 없습니다. 매물 상세 페이지에서 관심매물을 저장해 주세요.
                </Alert>
            ) : (
                <Row className="g-3 mt-2">
                    {favorites.map((property) => {
                        const isSelected = selectedIds.includes(property.id);

                        // 선택된 카드는 언제든 해제할 수 있어야 한다.
                        // 선택되지 않은 카드만 조건에 따라 비활성화한다.
                        const compareDisabled =
                            !isSelected &&
                            (
                                selectedIds.length >= 2 ||
                                (
                                    selectedDealType !== null &&
                                    property.dealType !== selectedDealType
                                )
                            );

                        return (
                            <Col key={property.id} md={4}>
                                <Card
                                    className={`h-100 favorite-card ${
                                        isSelected ? "favorite-card--selected" : ""
                                    }`}
                                >
                                    {property.images[0] && (
                                        <Card.Img
                                            variant="top"
                                            src={property.images[0].url}
                                            className="favorite-thumb"
                                        />
                                    )}

                                    <Card.Body className="d-flex flex-column">
                                        <div className="d-flex justify-content-between align-items-start mb-2">
                                            <Badge bg="secondary">
                                                {DEAL_TYPE_LABELS[property.dealType]}
                                            </Badge>

                                            <Button
                                                variant="link"
                                                className="p-0 favorite-heart"
                                                onClick={() => removeFavorite(property.id)}
                                                aria-label="관심매물 해제"
                                            >
                                                ♥
                                            </Button>
                                        </div>

                                        <Card.Title>
                                            {formatPrice(property)}
                                        </Card.Title>

                                        <Card.Text className="text-muted small mb-2">
                                            {property.address} · {property.area}㎡
                                        </Card.Text>

                                        <div className="mb-3">
                                            {property.tags.slice(0, 3).map((tag) => (
                                                <Badge
                                                    key={tag.id}
                                                    bg="light"
                                                    text="dark"
                                                    className="me-1 mb-1"
                                                >
                                                    {tag.name}
                                                </Badge>
                                            ))}
                                        </div>

                                        <div className="compare-select-box mb-3">
                                            <Form.Check
                                                type="checkbox"
                                                id={`compare-property-${property.id}`}
                                                label={
                                                    isSelected
                                                        ? "비교 선택됨"
                                                        : "비교 선택"
                                                }
                                                checked={isSelected}
                                                disabled={compareDisabled}
                                                onChange={() => toggleCompare(property)}
                                            />

                                            {compareDisabled &&
                                                selectedIds.length < 2 && (
                                                    <div className="text-muted small mt-1">
                                                        같은 거래유형만 비교할 수 있습니다.
                                                    </div>
                                                )}
                                        </div>

                                        <Link
                                            to={`/property/${property.id}`}
                                            className="btn btn-primary mt-auto"
                                        >
                                            상세 보기
                                        </Link>
                                    </Card.Body>
                                </Card>
                            </Col>
                        );
                    })}
                </Row>
            )}

            {favorites.length > 0 && (
                <div className="compare-selection-bar mt-4">
                    <div>
                        <strong>
                            비교할 매물 {selectedIds.length} / 2
                        </strong>
                        <div className="text-muted small">
                            같은 거래유형의 관심매물 2개를 선택하세요.
                        </div>
                    </div>

                    <Button
                        variant="primary"
                        disabled={selectedIds.length !== 2}
                        onClick={goToCompare}
                    >
                        선택 매물 비교
                    </Button>
                </div>
            )}
        </Container>
    );
}

export default FavoritesPage;