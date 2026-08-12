import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Container, Row, Col, Card, Badge, Button, Alert } from "react-bootstrap";
import customAxios from "../api/axiosInstance";
import type { PropertyResponse } from "../types/Property";
import "../components/FavoritesPage.css";
import { formatPrice, DEAL_TYPE_LABELS } from "../utils/propertyPrice";

// 관심목록 페이지. 목업(favorites.html)의 3개 탭(관심매물/알림/최근본매물) 중
// "관심매물" 탭만 우선 구현한다. 알림/최근본매물 탭은 나중에 추가.
function FavoritesPage() {
    const [favorites, setFavorites] = useState<PropertyResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const fetchFavorites = async () => {
            setLoading(true);
            try {
                const response = await customAxios.get<PropertyResponse[]>(`/property/favorites`);
                setFavorites(response.data);
            } catch (err) {
                console.error(err);
                setError("관심매물 목록을 불러오지 못했습니다.");
            } finally {
                setLoading(false);
            }
        };
        fetchFavorites();
    }, []);

    // 카드에서 바로 찜 해제. 서버 응답이 false(해제됨)로 오면 새로고침 없이 목록에서 바로 뺀다.
    // (안 그러면 해제했는데도 카드가 화면에 남아있어서 사용자 입장에서 어색함)
    const removeFavorite = async (propertyId: number) => {
        try {
            const response = await customAxios.post<{ favorited: boolean }>(`/property/${propertyId}/favorite`);
            if (!response.data.favorited) {
                setFavorites((prev) => prev.filter((p) => p.id !== propertyId));
            }
        } catch (err) {
            console.error(err);
        }
    };

    if (loading) return <Container className="mt-5">불러오는 중...</Container>;

    return (
        <Container className="mt-4 mb-5">
            <div className="text-muted small">Saved Homes</div>
            <h1>관심목록</h1>
            <p className="text-muted">찜한 매물을 한곳에서 관리합니다.</p>

            {error && <Alert variant="danger">{error}</Alert>}

            {favorites.length === 0 ? (
                <Alert variant="secondary" className="mt-4">
                    아직 찜한 매물이 없습니다. 마음에 드는 매물의 하트를 눌러 저장해 보세요.
                </Alert>
            ) : (
                <Row className="g-3 mt-2">
                    {favorites.map((property) => (
                        <Col key={property.id} md={4}>
                            <Card className="h-100">
                                {property.images[0] && (
                                    <Card.Img variant="top" src={property.images[0].url} className="favorite-thumb" />
                                )}
                                <Card.Body className="d-flex flex-column">
                                    <div className="d-flex justify-content-between align-items-start mb-2">
                                        <Badge bg="secondary">{DEAL_TYPE_LABELS[property.dealType]}</Badge>
                                        <Button
                                            variant="link"
                                            className="p-0 favorite-heart"
                                            onClick={() => removeFavorite(property.id)}
                                            aria-label="관심매물 해제"
                                        >
                                            ♥
                                        </Button>
                                    </div>
                                    <Card.Title>{formatPrice(property)}</Card.Title>
                                    <Card.Text className="text-muted small mb-2">
                                        {property.address} · {property.area}㎡
                                    </Card.Text>
                                    <div className="mb-3">
                                        {property.tags.slice(0, 3).map((tag) => (
                                            <Badge key={tag.id} bg="light" text="dark" className="me-1 mb-1">
                                                {tag.name}
                                            </Badge>
                                        ))}
                                    </div>
                                    <Link to={`/property/${property.id}`} className="btn btn-primary mt-auto">
                                        상세 보기
                                    </Link>
                                </Card.Body>
                            </Card>
                        </Col>
                    ))}
                </Row>
            )}
        </Container>
    );
}

export default FavoritesPage;