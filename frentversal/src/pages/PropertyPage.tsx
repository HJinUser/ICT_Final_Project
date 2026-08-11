import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Container, Row, Col, Card, Badge, Button, Form, Modal } from "react-bootstrap";
import customAxios from "../api/axiosInstance";
import { API_BASE_URL } from "../config/config";
import type { User } from "../types/User";
import type { PropertyDetail } from "../types/PropertyDetail";
import type { Review } from "../types/Review";
import "../components/PropertyPage.css";

interface PropertyPageProps {
    user: User | null;
    mockData?: PropertyDetail;
}

function PropertyPage({ user, mockData }: PropertyPageProps) {
    const { id } = useParams();
    const navigate = useNavigate();

    const [property, setProperty] = useState<PropertyDetail | null>(mockData ?? null);
    const [loading, setLoading] = useState(!mockData);

    // 비로그인 사용자가 로그인이 필요한 동작(문의/관심매물/한줄평 작성)을 시도했을 때 띄우는 안내 모달
    const [showLoginModal, setShowLoginModal] = useState(false);

    // 한줄평 작성창 관련 상태
    const [isWritingReview, setIsWritingReview] = useState(false);
    const [reviewRating, setReviewRating] = useState(5);
    const [reviewContent, setReviewContent] = useState("");

    // id가 바뀔 때마다(혹은 처음 로딩될 때) 매물 상세 정보를 서버에서 받아옴
    useEffect(() => {
        if (mockData) return; // 미리보기 모드면 실제 API 호출 생략

        const fetchDetail = async () => {
            setLoading(true);
            try {
                const response = await customAxios.get<PropertyDetail>(`${API_BASE_URL}/property/${id}`);
                setProperty(response.data);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        fetchDetail();
    }, [id]);

    // 로그인한 사용자가 상세 페이지를 열면 "최근 본 매물"에 기록 (최대 10개, 최신순).
    // 7일 이내인지 걸러서 보여주는 건 목록을 보여주는 화면(favorites.html 쪽)에서 처리할 몫이라 여기선 기록만 함.
    useEffect(() => {
        if (!user || !property) return;
        const KEY = "recentlyViewedProperties";
        const raw = localStorage.getItem(KEY);
        const list: { propertyId: number; viewedAt: string }[] = raw ? JSON.parse(raw) : [];
        const withoutCurrent = list.filter((item) => item.propertyId !== property.id);
        withoutCurrent.unshift({ propertyId: property.id, viewedAt: new Date().toISOString() });
        localStorage.setItem(KEY, JSON.stringify(withoutCurrent.slice(0, 10)));
    }, [user, property?.id]);

    // 비로그인 사용자가 문의/관심매물/한줄평 작성을 시도하면 이 함수를 호출해서 안내 모달을 띄움
    const requireLogin = () => {
        setShowLoginModal(true);
    };

    // 관심매물 저장/취소 토글 (로그인 사용자 전용)
    const toggleFavorite = async () => {
        if (!property) return;
        await customAxios.post(`${API_BASE_URL}/property/${property.id}/favorite`);
        setProperty({ ...property, isFavorited: !property.isFavorited });
    };

    // 좋아요/싫어요 → 추천 데이터에 반영 (일반 사용자 전용)
    const sendFeedback = async (liked: boolean) => {
        if (!property) return;
        await customAxios.post(`${API_BASE_URL}/property/${property.id}/feedback`, { liked });
        alert(liked ? "좋아요로 추천 데이터에 반영했습니다." : "싫어요로 추천 데이터에 반영했습니다.");
    };

    // "한줄평 작성" 버튼 클릭 — 비로그인이면 로그인 안내, 로그인 상태면 인라인 작성창 열기
    const startWritingReview = () => {
        if (!user) {
            requireLogin();
            return;
        }
        setIsWritingReview(true);
    };

    // 한줄평 등록
    const submitReview = async () => {
        if (!property) return;
        const response = await customAxios.post<Review>(`${API_BASE_URL}/property/${property.id}/review`, {
            rating: reviewRating,
            content: reviewContent,
        });
        setProperty({ ...property, reviews: [response.data, ...property.reviews] });
        setIsWritingReview(false);
        setReviewContent("");
        setReviewRating(5);
    };

    // 매물 상태 변경 (게시중/거래진행중/거래완료). 거래완료는 되돌릴 수 없음
    const handleDealStatusChange = async (newStatus: PropertyDetail["dealStatus"]) => {
        if (!property || property.dealStatus === "거래완료") return;
        await customAxios.patch(`${API_BASE_URL}/property/${property.id}/status`, { dealStatus: newStatus });
        setProperty({ ...property, dealStatus: newStatus });
    };

    // 공개/비공개 전환
    const togglePublic = async () => {
        if (!property) return;
        const nextPublic = !property.isPublic;
        await customAxios.patch(`${API_BASE_URL}/property/${property.id}/visibility`, { isPublic: nextPublic });
        setProperty({ ...property, isPublic: nextPublic });
    };

    // 등록 취소 (되돌릴 수 없어서 한 번 더 확인)
    const cancelListing = async () => {
        if (!property || property.dealStatus === "등록취소") return;
        if (!window.confirm("정말 매물 등록을 취소하시겠어요? 취소하면 되돌릴 수 없습니다.")) return;
        await customAxios.patch(`${API_BASE_URL}/property/${property.id}/status`, { dealStatus: "등록취소" });
        setProperty({ ...property, dealStatus: "등록취소" });
    };

    if (loading) return <Container className="mt-5">불러오는 중...</Container>;
    if (!property) return <Container className="mt-5">매물 정보를 찾을 수 없습니다.</Container>;

    const role = user?.role; // undefined(비회원) | "USER" | "BROKER" | "ADMIN"
    const isOwner = user?.role === "BROKER" && user.id === property.ownerId; // 이 매물을 등록한 중개인 본인인지

    // AI 예상 시세와 현재 가격의 차이 (양수면 시세보다 저렴, 음수면 시세보다 비쌈)
    const priceDiff = property.aiEstimatedPrice - property.price;

    return (
        <Container className="mt-4 mb-5">
            {/* 상단: 매물명 + 가격 관련 배지 + AI 예상 시세 */}
            <Row className="align-items-center mb-4">
                <Col>
                    <div className="text-muted small">Property Detail</div>
                    <h1>{property.name}</h1>
                    <div className="d-flex gap-2 mb-2">
                        <Badge bg={priceDiff >= 0 ? "success" : "danger"}>
                            시세보다 {Math.abs(priceDiff).toLocaleString()} {priceDiff >= 0 ? "낮음" : "높음"}
                        </Badge>
                        {/* 중개인이 가격을 변경했을 때만 표시되는 배지 */}
                        {property.priceStatus && (
                            <Badge bg={property.priceStatus === "하락" ? "success" : "danger"}>
                                가격 {property.priceStatus}
                            </Badge>
                        )}
                    </div>
                    <p className="text-muted">{property.description}</p>
                </Col>
                <Col md="auto">
                    <Card className="p-3 text-center">
                        <span className="text-muted small">AI 예상 시세</span>
                        <strong className="fs-3">{property.aiEstimatedPrice.toLocaleString()}</strong>
                    </Card>
                </Col>
            </Row>

            {/* 사진 갤러리: 큰 사진 1개 + 작은 사진 2개 */}
            <Row className="g-2 mb-4">
                {property.photos.map((url, i) => (
                    <Col key={i} md={i === 0 ? 6 : 3}>
                        <img src={url} alt={`매물 사진 ${i + 1}`} className="w-100 gallery-photo" />
                    </Col>
                ))}
            </Row>

            <Row>
                {/* 좌측: 본문 정보 */}
                <Col md={8} className="d-flex flex-column gap-3">
                    <Card className="p-3">
                        <div className="d-flex justify-content-between align-items-start mb-2">
                            <h2 className="mb-0">매물 기본정보</h2>
                            {/* 관리자에게만: 등록한 중개인 정보 */}
                            {role === "ADMIN" && (
                                <Badge bg="light" text="dark">
                                    등록: {property.agency.agentName} 공인중개사
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
                                <strong className="d-block fs-4">{property.aiEstimatedPrice.toLocaleString()}</strong>
                            </Col>
                            <Col className="text-end">
                                <span className="text-muted small">현재 호가</span>
                                <strong className="d-block fs-5">{property.price.toLocaleString()}</strong>
                            </Col>
                        </Row>
                        <div className="d-flex align-items-end gap-2 mt-3 bar-chart">
                            {property.priceHistory.map((point, i) => (
                                <div key={i} className="text-center">
                                    <div
                                        className="bar"
                                        style={{ height: `${(point.price / property.aiEstimatedPrice) * 100}px` }}
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
                                <Badge key={tag} bg="light" text="dark" className="me-2 mb-2">{tag}</Badge>
                            ))}
                        </div>
                    </Card>

                    {/* 일반 사용자에게만: 좋아요/싫어요 (추천 데이터 반영) */}
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

                        {/* 로그인 사용자가 "한줄평 작성"을 누르면 목록 위에 인라인 작성창이 생김 */}
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

                {/* 우측: 가격 패널 + 역할별 액션 */}
                <Col md={4}>
                    <Card className="p-3 mb-3">
                        <Badge bg="light" text="dark" className="mb-2 align-self-start">확인 매물</Badge>
                        <div className="fs-4 fw-bold">{property.dealType} {property.price.toLocaleString()}</div>
                        <p className="text-muted">{property.address} · 관리비 {property.maintenanceFee}만 원</p>
                        <hr />

                        {/* 비회원 */}
                        {!user && (
                            <div className="d-grid gap-2">
                                <Button variant="primary" onClick={requireLogin}>중개사 문의</Button>
                                <Button variant="outline-primary" onClick={requireLogin}>♡ 관심매물 저장</Button>
                            </div>
                        )}

                        {/* 일반 사용자 */}
                        {role === "USER" && (
                            <div className="d-grid gap-2">
                                <Link to="/inquiry" className="btn btn-primary">중개사 문의</Link>
                                <Button variant="outline-primary" onClick={toggleFavorite}>
                                    {property.isFavorited ? "♥ 관심매물 취소" : "♡ 관심매물 저장"}
                                </Button>
                            </div>
                        )}

                        {/* 중개인 — 본인 매물일 때만 관리 버튼 노출 */}
                        {isOwner && (
                            <div className="d-grid gap-2">
                                <Link to={`/property/form/${property.id}`} className="btn btn-primary">매물 수정</Link>
                                <Form.Select
                                    size="sm"
                                    value={property.dealStatus}
                                    disabled={property.dealStatus === "거래완료"}
                                    onChange={(e) => handleDealStatusChange(e.target.value as PropertyDetail["dealStatus"])}
                                >
                                    <option value="게시중">게시중</option>
                                    <option value="거래진행중">거래진행중</option>
                                    <option value="거래완료">거래완료</option>
                                </Form.Select>
                                <Button variant="outline-secondary" onClick={togglePublic}>
                                    {property.isPublic ? "비공개" : "공개"}
                                </Button>
                                <Button
                                    variant="outline-danger"
                                    onClick={cancelListing}
                                    disabled={property.dealStatus === "등록취소"}
                                >
                                    등록 취소
                                </Button>
                            </div>
                        )}

                        {/* 관리자 — 누구 매물이든 항상 관리 가능 */}
                        {role === "ADMIN" && (
                            <div className="d-grid gap-2">
                                <Link to={`/property/form/${property.id}`} className="btn btn-primary">매물 수정</Link>
                                <Link to={`/property/edit-request/${property.id}`} className="btn btn-outline-secondary">수정 요청</Link>
                                <Button variant="outline-secondary" onClick={togglePublic}>
                                    {property.isPublic ? "비공개" : "공개"}
                                </Button>
                                <Button
                                    variant="outline-danger"
                                    onClick={cancelListing}
                                    disabled={property.dealStatus === "등록취소"}
                                >
                                    등록 취소
                                </Button>
                            </div>
                        )}
                    </Card>

                    <Card className="p-3 mb-3">
                        <Badge bg="success">상담 가능</Badge>
                        <h3 className="mt-2">{property.agency.name}</h3>
                        <p className="text-muted small mt-2 mb-2">
                            담당: {property.agency.agentName}<br />
                            등록번호 {property.agency.registrationNo}<br />
                            {property.agency.address}<br />
                            {property.agency.phone}
                        </p>
                        {/* 중개사무소 상세로 이동하면서, 그쪽 문의 폼에 매물명이 자동 입력되도록 쿼리로 넘김 */}
                        <Link
                            to={`/agency/${property.agency.id}?propertyName=${encodeURIComponent(property.name)}`}
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

            {/* 비로그인 사용자가 문의/관심매물/한줄평 작성을 시도했을 때 뜨는 안내 모달 */}
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
