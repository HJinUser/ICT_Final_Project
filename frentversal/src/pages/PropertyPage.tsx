import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Container, Row, Col, Card, Badge, Button, Form, Modal } from "react-bootstrap";
// customAxios 는 baseURL 이 이미 "/api" 라서, 요청 주소는 "/property/1" 처럼 그 뒤만 적는다.
// 여기에 API_BASE_URL 을 또 붙이면 "/api/api/property/1" 이 되어 서버가 못 알아듣는다.
import customAxios from "../api/axiosInstance";
import type { User } from "../types/User";
import type { PropertyDetail } from "../types/PropertyDetail";
import { PROPERTY_STATUS_LABELS } from "../types/PropertyDetail";
import type { PropertyResponse, PropertyStatusCode } from "../types/Property";
import type { AgencyResponse } from "../types/Agency";
import type { Review } from "../types/Review";
import "../components/PropertyPage.css";

interface PropertyPageProps {
    user: User | null;
    mockData?: PropertyDetail;
}

// 거래유형에 따라 실제로 보여줄 가격을 하나로 뽑아준다 (매매=price, 전세=deposit, 월세=monthlyDeposit 기준)
const getPrimaryPrice = (property: PropertyResponse): number => {
    if (property.dealType === "SALE") return property.price ?? 0;
    if (property.dealType === "JEONSE") return property.deposit ?? 0;
    return property.monthlyDeposit ?? 0; // MONTHLY: 월세 금액(monthlyRent)은 별도로 같이 표시
};

// 화면에 보여줄 가격 문자열 (월세는 "보증금/월세" 형태)
const formatPrice = (property: PropertyResponse): string => {
    if (property.dealType === "MONTHLY") {
        return `${(property.monthlyDeposit ?? 0).toLocaleString()}/${(property.monthlyRent ?? 0).toLocaleString()}`;
    }
    return getPrimaryPrice(property).toLocaleString();
};

function PropertyPage({ user, mockData }: PropertyPageProps) {
    const { id } = useParams();
    const navigate = useNavigate();

    const [property, setProperty] = useState<PropertyDetail | null>(mockData ?? null);
    const [loading, setLoading] = useState(!mockData);

    const [showLoginModal, setShowLoginModal] = useState(false);

    const [isWritingReview, setIsWritingReview] = useState(false);
    const [reviewRating, setReviewRating] = useState(5);
    const [reviewContent, setReviewContent] = useState("");

    // id가 바뀔 때마다(혹은 처음 로딩될 때) 매물 상세 정보를 서버에서 받아옴.
    // PropertyResponse엔 agencyId만 있어서, 중개사무소 전체 정보는 GET /agency/{agencyId}를 한 번 더 호출해서 합친다.
    useEffect(() => {
        if (mockData) return; // 미리보기 모드면 실제 API 호출 생략

        const fetchDetail = async () => {
            setLoading(true);
            try {
                const propertyResponse = await customAxios.get<PropertyResponse>(`/property/${id}`);
                const agencyResponse = await customAxios.get<AgencyResponse>(
                    `/agency/${propertyResponse.data.agencyId}`
                );

                setProperty({
                    ...propertyResponse.data,
                    // 아래는 아직 백엔드가 안 챙겨주는 화면 전용 필드 (TODO: 도메인 완성되면 실제 값으로 교체)
                    ownerId: 0, // TODO: agency 담당 팀원이 memberId 노출해주면 그 값으로 교체
                    agencyDetail: {
                        id: agencyResponse.data.id,
                        name: agencyResponse.data.name,
                        registrationNo: "", // AgencyResponse엔 아직 없는 컬럼
                        address: agencyResponse.data.address,
                        phone: agencyResponse.data.phone ?? "",
                        agentName: agencyResponse.data.brokerName,
                        available: agencyResponse.data.status === "AVAILABLE",
                    },
                    priceHistory: [],
                    reviews: [],
                    isFavorited: false,
                });
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        fetchDetail();
    }, [id]);

    // 로그인한 사용자가 상세 페이지를 열면 "최근 본 매물"에 기록 (최대 10개, 최신순).
    useEffect(() => {
        if (!user || !property) return;
        const KEY = "recentlyViewedProperties";
        const raw = localStorage.getItem(KEY);
        const list: { propertyId: number; viewedAt: string }[] = raw ? JSON.parse(raw) : [];
        const withoutCurrent = list.filter((item) => item.propertyId !== property.id);
        withoutCurrent.unshift({ propertyId: property.id, viewedAt: new Date().toISOString() });
        localStorage.setItem(KEY, JSON.stringify(withoutCurrent.slice(0, 10)));
    }, [user, property?.id]);

    const requireLogin = () => {
        setShowLoginModal(true);
    };

    // 관심매물 저장/취소 토글 (로그인 사용자 전용) — TODO: 관심매물 엔드포인트 연동 전, 화면 상태만 토글
    const toggleFavorite = async () => {
        if (!property) return;
        await customAxios.post(`/property/${property.id}/favorite`);
        setProperty({ ...property, isFavorited: !property.isFavorited });
    };

    const sendFeedback = async (liked: boolean) => {
        if (!property) return;
        await customAxios.post(`/property/${property.id}/feedback`, { liked });
        alert(liked ? "좋아요로 추천 데이터에 반영했습니다." : "싫어요로 추천 데이터에 반영했습니다.");
    };

    const startWritingReview = () => {
        if (!user) {
            requireLogin();
            return;
        }
        setIsWritingReview(true);
    };

    // 한줄평 등록 — TODO: Review 도메인 아직 없음, 엔드포인트 생기면 응답 타입 맞춰서 교체
    const submitReview = async () => {
        if (!property) return;
        const response = await customAxios.post<Review>(`/property/${property.id}/review`, {
            rating: reviewRating,
            content: reviewContent,
        });
        setProperty({ ...property, reviews: [response.data, ...property.reviews] });
        setIsWritingReview(false);
        setReviewContent("");
        setReviewRating(5);
    };

    // 거래 상태 변경 (게시중/거래진행중/거래완료). 거래완료·등록취소는 되돌릴 수 없음.
    // 백엔드가 갱신된 매물 전체를 돌려주므로, 그 응답으로 상태를 맞춘다.
    const handleStatusChange = async (newStatus: PropertyStatusCode) => {
        if (!property || property.status === "COMPLETED" || property.status === "CANCELLED") return;
        const response = await customAxios.patch<PropertyResponse>(
            `/property/${property.id}/status`,
            { status: newStatus }
        );
        setProperty({ ...property, status: response.data.status });
    };

    // 공개/비공개 전환. 백엔드가 현재 값을 반전시켜서 돌려주므로 body 없이 호출한다.
    const togglePublic = async () => {
        if (!property) return;
        const response = await customAxios.patch<PropertyResponse>(`/property/${property.id}/visibility`);
        setProperty({ ...property, visible: response.data.visible });
    };

    // 등록 취소 (되돌릴 수 없어서 한 번 더 확인). 전용 /cancel 엔드포인트를 쓴다 (body 없음).
    const cancelListing = async () => {
        if (!property || property.status === "CANCELLED") return;
        if (!window.confirm("정말 매물 등록을 취소하시겠어요? 취소하면 되돌릴 수 없습니다.")) return;
        const response = await customAxios.patch<PropertyResponse>(`/property/${property.id}/cancel`);
        setProperty({ ...property, status: response.data.status });
    };

    if (loading) return <Container className="mt-5">불러오는 중...</Container>;
    if (!property) return <Container className="mt-5">매물 정보를 찾을 수 없습니다.</Container>;

    const role = user?.role; // undefined(비회원) | "USER" | "BROKER" | "ADMIN"
    const isOwner = user?.role === "BROKER" && user.id === property.ownerId; // 이 매물을 등록한 중개인 본인인지

    const priceDiff = (property.aiPrice ?? 0) - getPrimaryPrice(property);

    return (
        <Container className="mt-4 mb-5">
            <Row className="align-items-center mb-4">
                <Col>
                    <div className="text-muted small">Property Detail</div>
                    <h1>{property.name}</h1>
                    <div className="d-flex gap-2 mb-2">
                        <Badge bg={priceDiff >= 0 ? "success" : "danger"}>
                            시세보다 {Math.abs(priceDiff).toLocaleString()} {priceDiff >= 0 ? "낮음" : "높음"}
                        </Badge>
                        {property.priceStatus && (
                            <Badge bg={property.priceStatus === "DOWN" ? "success" : "danger"}>
                                가격 {property.priceStatus === "DOWN" ? "하락" : "상승"}
                            </Badge>
                        )}
                    </div>
                    <p className="text-muted">{property.description}</p>
                </Col>
                <Col md="auto">
                    <Card className="p-3 text-center">
                        <span className="text-muted small">AI 예상 시세</span>
                        <strong className="fs-3">{(property.aiPrice ?? 0).toLocaleString()}</strong>
                    </Card>
                </Col>
            </Row>

            <Row className="g-2 mb-4">
                {property.images.map((image, i) => (
                    <Col key={image.id} md={i === 0 ? 6 : 3}>
                        <img src={image.url} alt={`매물 사진 ${i + 1}`} className="w-100 gallery-photo" />
                    </Col>
                ))}
            </Row>

            <Row>
                <Col md={8} className="d-flex flex-column gap-3">
                    <Card className="p-3">
                        <div className="d-flex justify-content-between align-items-start mb-2">
                            <h2 className="mb-0">매물 기본정보</h2>
                            {role === "ADMIN" && (
                                <Badge bg="light" text="dark">
                                    등록: {property.agencyDetail.agentName} 공인중개사
                                </Badge>
                            )}
                        </div>
                        <Row>
                            <Col xs={3}><span className="text-muted small">전용면적</span><strong className="d-block">{property.area}㎡</strong></Col>
                            <Col xs={3}><span className="text-muted small">층수</span><strong className="d-block">{property.floor}층</strong></Col>
                            <Col xs={3}><span className="text-muted small">방·욕실</span><strong className="d-block">{property.roomCount} / {property.bathroomCount}</strong></Col>
                            <Col xs={3}><span className="text-muted small">입주가능일</span><strong className="d-block">{property.moveInDate || "즉시 입주"}</strong></Col>
                        </Row>
                    </Card>

                    <Card className="p-3 ai-band">
                        <h2>AI 시세예측</h2>
                        <Row>
                            <Col>
                                <span className="text-muted small">예상 적정 전세가</span>
                                <strong className="d-block fs-4">{(property.aiPrice ?? 0).toLocaleString()}</strong>
                            </Col>
                            <Col className="text-end">
                                <span className="text-muted small">현재 호가</span>
                                <strong className="d-block fs-5">{formatPrice(property)}</strong>
                            </Col>
                        </Row>
                        <div className="d-flex align-items-end gap-2 mt-3 bar-chart">
                            {property.priceHistory.map((point, i) => (
                                <div key={i} className="text-center">
                                    <div
                                        className="bar"
                                        style={{ height: `${(point.price / (property.aiPrice || 1)) * 100}px` }}
                                    />
                                    <span className="xs">{point.year}</span>
                                </div>
                            ))}
                        </div>
                    </Card>

                    <Card className="p-3">
                        <h2>주변환경</h2>
                        <div className="mt-2">
                            {property.tags.map((tag) => (
                                <Badge key={tag.id} bg="light" text="dark" className="me-2 mb-2">{tag.name}</Badge>
                            ))}
                        </div>
                    </Card>

                    {role === "USER" && (
                        <Card className="p-3">
                            <Row className="align-items-center">
                                <Col>
                                    <h3>이 매물은 어떠셨나요?</h3>
                                    <p className="text-muted mb-0">선택은 추천 데이터에 반영됩니다.</p>
                                </Col>
                                <Col md="auto">
                                    <Button variant="outline-secondary" className="me-2" onClick={() => sendFeedback(true)}>👍 좋아요</Button>
                                    <Button variant="outline-secondary" onClick={() => sendFeedback(false)}>👎 싫어요</Button>
                                </Col>
                            </Row>
                        </Card>
                    )}

                    <Card className="p-3">
                        <div className="d-flex justify-content-between align-items-center">
                            <h2 className="mb-0">한줄평</h2>
                            <Button variant="outline-secondary" size="sm" onClick={startWritingReview}>한줄평 작성</Button>
                        </div>

                        {isWritingReview && (
                            <div className="review-composer mt-3 mb-3">
                                <Form.Select
                                    size="sm"
                                    style={{ width: 110 }}
                                    className="mb-2"
                                    value={reviewRating}
                                    onChange={(e) => setReviewRating(Number(e.target.value))}
                                >
                                    {[5, 4, 3, 2, 1].map((n) => (
                                        <option key={n} value={n}>{"★".repeat(n)}</option>
                                    ))}
                                </Form.Select>
                                <Form.Control
                                    as="textarea"
                                    rows={2}
                                    placeholder="이 매물에 대한 한줄평을 남겨주세요"
                                    value={reviewContent}
                                    onChange={(e) => setReviewContent(e.target.value)}
                                />
                                <div className="d-flex justify-content-end gap-2 mt-2">
                                    <Button variant="outline-secondary" size="sm" onClick={() => setIsWritingReview(false)}>취소</Button>
                                    <Button variant="primary" size="sm" onClick={submitReview}>등록</Button>
                                </div>
                            </div>
                        )}

                        {property.reviews.map((review) => (
                            <div key={review.id} className="review-item">
                                <div className="d-flex justify-content-between">
                                    <span>{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</span>
                                    <span className="text-muted small">{review.createdAt}</span>
                                </div>
                                <p className="mt-1 mb-0">{review.content}</p>
                            </div>
                        ))}
                    </Card>
                </Col>

                <Col md={4}>
                    <Card className="p-3 mb-3">
                        <Badge bg="light" text="dark" className="mb-2 align-self-start">{PROPERTY_STATUS_LABELS[property.status]}</Badge>
                        <div className="fs-4 fw-bold">{property.dealType} {formatPrice(property)}</div>
                        <p className="text-muted">{property.address} · 관리비 {property.maintenanceFee}만 원</p>
                        <hr />

                        {!user && (
                            <div className="d-grid gap-2">
                                <Button variant="primary" onClick={requireLogin}>중개사 문의</Button>
                                <Button variant="outline-primary" onClick={requireLogin}>♡ 관심매물 저장</Button>
                            </div>
                        )}

                        {role === "USER" && (
                            <div className="d-grid gap-2">
                                <Link to="/inquiry" className="btn btn-primary">중개사 문의</Link>
                                <Button variant="outline-primary" onClick={toggleFavorite}>
                                    {property.isFavorited ? "♥ 관심매물 취소" : "♡ 관심매물 저장"}
                                </Button>
                            </div>
                        )}

                        {isOwner && (
                            <div className="d-grid gap-2">
                                <Link to={`/property/form/${property.id}`} className="btn btn-primary">매물 수정</Link>
                                <Form.Select
                                    size="sm"
                                    value={property.status}
                                    disabled={property.status === "COMPLETED"}
                                    onChange={(e) => handleStatusChange(e.target.value as PropertyStatusCode)}
                                >
                                    <option value="ACTIVE">게시중</option>
                                    <option value="IN_PROGRESS">거래진행중</option>
                                    <option value="COMPLETED">거래완료</option>
                                </Form.Select>
                                <Button variant="outline-secondary" onClick={togglePublic}>
                                    {property.visible ? "비공개" : "공개"}
                                </Button>
                                <Button
                                    variant="outline-danger"
                                    onClick={cancelListing}
                                    disabled={property.status === "CANCELLED"}
                                >
                                    등록 취소
                                </Button>
                            </div>
                        )}

                        {role === "ADMIN" && (
                            <div className="d-grid gap-2">
                                <Link to={`/property/form/${property.id}`} className="btn btn-primary">매물 수정</Link>
                                <Link to={`/property/edit-request/${property.id}`} className="btn btn-outline-secondary">수정 요청</Link>
                                <Button variant="outline-secondary" onClick={togglePublic}>
                                    {property.visible ? "비공개" : "공개"}
                                </Button>
                                <Button
                                    variant="outline-danger"
                                    onClick={cancelListing}
                                    disabled={property.status === "CANCELLED"}
                                >
                                    등록 취소
                                </Button>
                            </div>
                        )}
                    </Card>

                    <Card className="p-3 mb-3">
                        <Badge bg="success">상담 가능</Badge>
                        <h3 className="mt-2">{property.agencyDetail.name}</h3>
                        <p className="text-muted small mt-2 mb-2">
                            담당: {property.agencyDetail.agentName}<br />
                            등록번호 {property.agencyDetail.registrationNo}<br />
                            {property.agencyDetail.address}<br />
                            {property.agencyDetail.phone}
                        </p>
                        <Link
                            to={`/agency/${property.agencyId}?propertyName=${encodeURIComponent(property.name)}`}
                            className="btn btn-outline-primary w-100"
                        >
                            중개사무소 상세
                        </Link>
                    </Card>

                    {(role === "USER" || role === "BROKER") && (
                        <Link to={`/report/form?propertyId=${property.id}`} className="btn btn-outline-danger w-100">
                            허위매물 신고
                        </Link>
                    )}
                </Col>
            </Row>

            <Modal show={showLoginModal} onHide={() => setShowLoginModal(false)} centered>
                <Modal.Body className="text-center py-4">
                    로그인 해주시기 바랍니다.
                </Modal.Body>
                <Modal.Footer className="justify-content-center">
                    <Button variant="outline-secondary" onClick={() => setShowLoginModal(false)}>취소</Button>
                    <Button variant="primary" onClick={() => navigate("/member/login")}>로그인 하기</Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
}

export default PropertyPage;
