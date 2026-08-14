import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Container, Table, Badge, Form, Alert, Row, Col } from "react-bootstrap";
import customAxios from "../api/axiosInstance";
import type { PropertyResponse, PropertyStatusCode } from "../types/Property";
import "../styles/MyPropertiesPage.css";
import { formatPrice, DEAL_TYPE_LABELS } from "../utils/propertyPrice";

// 매물 상태 -> 뱃지 라벨/색상 (목업 agent-dashboard.html의 상태 배지 색을 따름)
const STATUS_LABELS: Record<PropertyStatusCode, string> = {
    PENDING: "승인 대기",
    ACTIVE: "게시중",
    IN_PROGRESS: "거래진행중",
    COMPLETED: "거래완료",
    CANCELLED: "등록취소",
};
const STATUS_COLORS: Record<PropertyStatusCode, string> = {
    PENDING: "warning",
    ACTIVE: "success",
    IN_PROGRESS: "primary",
    COMPLETED: "secondary",
    CANCELLED: "danger",
};

// 중개인이 본인이 등록한 매물을 관리하는 화면 (목업 agent-dashboard.html의 "본인이 등록한 매물 리스트" 표 부분).
// 대시보드 숫자/문의 관리는 이미 BrokerMyPage에 있으므로 여기서는 매물 목록만 다룬다.
function MyPropertiesPage() {
    const [properties, setProperties] = useState<PropertyResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [keyword, setKeyword] = useState("");
    const [statusFilter, setStatusFilter] = useState<PropertyStatusCode | "ALL">("ALL");

    useEffect(() => {
        const fetchMine = async () => {
            setLoading(true);
            try {
                const response = await customAxios.get<PropertyResponse[]>(`/property/mine`);
                setProperties(response.data);
                setError("");
            } catch (err: any) {
                setError(err.response?.data?.message ?? "매물 목록을 불러오지 못했습니다.");
            } finally {
                setLoading(false);
            }
        };
        fetchMine();
    }, []);

    // 검색어(매물명/주소) + 상태 필터를 함께 적용한 목록
    const filtered = useMemo(() => {
        return properties.filter((property) => {
            const matchesKeyword =
                keyword.trim() === "" ||
                property.name.includes(keyword) ||
                property.address.includes(keyword);
            const matchesStatus = statusFilter === "ALL" || property.status === statusFilter;
            return matchesKeyword && matchesStatus;
        });
    }, [properties, keyword, statusFilter]);

    if (loading) return <Container className="mt-5">불러오는 중...</Container>;

    return (
        <Container className="mt-4 mb-5">
            <Row className="align-items-center mb-3">
                <Col>
                    <div className="text-muted small">My Properties</div>
                    <h1>내 매물 관리</h1>
                    <p className="text-muted">등록한 매물의 수정, 상태, 공개 여부를 관리합니다.</p>
                </Col>
                <Col md="auto">
                    <Link to="/property/form" className="btn btn-primary">매물 등록</Link>
                </Col>
            </Row>

            {error && <Alert variant="danger">{error}</Alert>}

            <Row className="g-2 mb-3">
                <Col md={8}>
                    <Form.Control
                        placeholder="매물명 또는 주소 검색"
                        value={keyword}
                        onChange={(e) => setKeyword(e.target.value)}
                    />
                </Col>
                <Col md={4}>
                    <Form.Select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as PropertyStatusCode | "ALL")}
                    >
                        <option value="ALL">전체 상태</option>
                        {(Object.keys(STATUS_LABELS) as PropertyStatusCode[]).map((code) => (
                            <option value={code} key={code}>{STATUS_LABELS[code]}</option>
                        ))}
                    </Form.Select>
                </Col>
            </Row>

            {!error && filtered.length === 0 ? (
                <Alert variant="secondary">조건에 맞는 매물이 없습니다.</Alert>
            ) : (
                <Table hover responsive className="my-properties-table">
                    <thead>
                    <tr>
                        <th>매물</th>
                        <th>거래유형</th>
                        <th>가격</th>
                        <th>상태</th>
                        <th>등록일</th>
                        <th></th>
                    </tr>
                    </thead>
                    <tbody>
                    {filtered.map((property) => (
                        <tr key={property.id}>
                            <td>
                                <div className="d-flex align-items-center gap-2">
                                    {property.images[0] && (
                                        <img
                                            src={property.images[0].url}
                                            alt={property.name}
                                            className="my-properties-thumb"
                                        />
                                    )}
                                    <div>
                                        <div className="fw-semibold">{property.name}</div>
                                        <div className="text-muted small">{property.address}</div>
                                    </div>
                                </div>
                            </td>
                            <td>{DEAL_TYPE_LABELS[property.dealType]}</td>
                            <td>{formatPrice(property)}</td>
                            <td>
                                <Badge bg={STATUS_COLORS[property.status]}>
                                    {STATUS_LABELS[property.status]}
                                </Badge>
                                {!property.visible && (
                                    <Badge bg="light" text="dark" className="ms-1">비공개</Badge>
                                )}
                            </td>
                            <td>{property.createdAt?.slice(0, 10)}</td>
                            <td>
                                <Link to={`/property/form/${property.id}`} className="btn btn-sm btn-outline-primary me-1">
                                    수정
                                </Link>
                                <Link to={`/property/${property.id}`} className="btn btn-sm btn-outline-secondary">
                                    관리
                                </Link>
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </Table>
            )}
        </Container>
    );
}

export default MyPropertiesPage;