import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
// customAxios 는 baseURL 이 이미 "/api" 라서, 요청 주소는 "/property/1" 처럼 그 뒤만 적는다.
// 여기에 API_BASE_URL 을 또 붙이면 "/api/api/property/1" 이 되어 서버가 못 알아듣는다.
import customAxios from "../api/axiosInstance";
import type { User } from "../types/User";
import type { PropertyDetail } from "../types/PropertyDetail";
import { PROPERTY_STATUS_LABELS } from "../types/PropertyDetail";
import type { PropertyResponse, PropertyStatusCode } from "../types/Property";
import type { AgencyDetail } from "../types/Agency";
import type { Review } from "../types/Review";
import "../styles/PropertyPage.css";
import { DEAL_TYPE_LABELS } from "../utils/propertyPrice.ts";

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

// 거래유형에 따라 AI 예상가 중 실제로 비교할 값 하나를 뽑아준다. 아직 예측 전이면 null
const getPrimaryAiPrice = (property: PropertyResponse): number | null => {
    if (property.dealType === "SALE") return property.aiPrice;
    if (property.dealType === "JEONSE") return property.aiDeposit;
    return property.aiMonthlyDeposit;
};

// 관리자가 선택한 가격평가 상태별 화면 표시값
const PRICE_EVALUATION_META = {
    UNDERVALUED: { label: "저평가", className: "green" },
    FAIR: { label: "적정", className: "gray" },
    OVERVALUED: { label: "고평가", className: "orange" },
} as const;

// 거래유형에 맞는 AI 예상 시세를 화면용 문자열로 변환
const formatAiPrice = (property: PropertyResponse): string => {
    if (property.dealType === "SALE") {
        return property.aiPrice == null
            ? "예측 전"
            : `${property.aiPrice.toLocaleString()}만 원`;
    }

    if (property.dealType === "JEONSE") {
        return property.aiDeposit == null
            ? "예측 전"
            : `${property.aiDeposit.toLocaleString()}만 원`;
    }

    if (
        property.aiMonthlyDeposit == null ||
        property.aiMonthlyRent == null
    ) {
        return "예측 전";
    }

    return `보증금 ${property.aiMonthlyDeposit.toLocaleString()}만 원 / 월세 ${property.aiMonthlyRent.toLocaleString()}만 원`;
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
                const agencyResponse = await customAxios.get<AgencyDetail>(
                    `/agency/${propertyResponse.data.agencyId}`
                );

                let isFavorited = false;

                if (user?.role === "USER") {
                    try {
                        const favoritesResponse = await customAxios.get<PropertyResponse[]>(
                            "/property/favorites"
                        );

                        isFavorited = favoritesResponse.data.some(
                            (favorite) => favorite.id === propertyResponse.data.id
                        );
                    } catch (error) {
                        console.error("관심매물 상태 조회 실패:", error);
                    }
                }

                setProperty({
                    ...propertyResponse.data,
                    // 아래는 아직 백엔드가 안 챙겨주는 화면 전용 필드 (TODO: 도메인 완성되면 실제 값으로 교체)
                    ownerId: agencyResponse.data.memberId, // Agency 응답의 memberId = 이 사무소를 운영하는 회원 id
                    agencyDetail: {
                        id: agencyResponse.data.id,
                        name: agencyResponse.data.name,
                        registrationNo: agencyResponse.data.registrationNo ?? "", // AgencyResponse엔 아직 없는 컬럼
                        address: agencyResponse.data.address,
                        phone: agencyResponse.data.phone ?? "",
                        agentName: agencyResponse.data.brokerName,
                        available: agencyResponse.data.status === "AVAILABLE",
                    },
                    priceHistory: [],
                    reviews: [],
                    isFavorited,
                });
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };

        fetchDetail();
    }, [id, mockData, user]);

    // 로그인한 사용자가 상세 페이지를 열면 "최근 본 매물"에 기록 (최대 10개, 최신순).
    const viewedPropertyId = property?.id;

    useEffect(() => {
        if (!user || !viewedPropertyId) return;

        const KEY = "recentlyViewedProperties";
        const raw = localStorage.getItem(KEY);
        const list: { propertyId: number; viewedAt: string }[] = raw
            ? JSON.parse(raw)
            : [];

        const withoutCurrent = list.filter(
            (item) => item.propertyId !== viewedPropertyId
        );

        withoutCurrent.unshift({
            propertyId: viewedPropertyId,
            viewedAt: new Date().toISOString(),
        });

        localStorage.setItem(
            KEY,
            JSON.stringify(withoutCurrent.slice(0, 10))
        );
    }, [user, viewedPropertyId]);

    const requireLogin = () => {
        setShowLoginModal(true);
    };

    // 관심매물 저장/취소 토글 (로그인 사용자 전용)
    const toggleFavorite = async () => {
        if (!property) return;

        try {
            const response = await customAxios.post<{ favorited: boolean }>(
                `/property/${property.id}/favorite`
            );

            setProperty((prev) =>
                prev
                    ? {
                          ...prev,
                          isFavorited: response.data.favorited,
                      }
                    : prev
            );
        } catch (error) {
            console.error("관심매물 저장/취소 실패:", error);
            alert("관심매물 처리 중 오류가 발생했습니다.");
        }
    };

    const sendFeedback = async (liked: boolean) => {
        if (!property) return;

        await customAxios.post(`/property/${property.id}/feedback`, {
            liked,
        });

        alert(
            liked
                ? "좋아요로 추천 데이터에 반영했습니다."
                : "싫어요로 추천 데이터에 반영했습니다."
        );
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

        const response = await customAxios.post<Review>(
            `/property/${property.id}/review`,
            {
                rating: reviewRating,
                content: reviewContent,
            }
        );

        setProperty({
            ...property,
            reviews: [response.data, ...property.reviews],
        });

        setIsWritingReview(false);
        setReviewContent("");
        setReviewRating(5);
    };

    // 거래 상태 변경 (게시중/거래진행중/거래완료). 거래완료·등록취소는 되돌릴 수 없음.
    // 백엔드가 갱신된 매물 전체를 돌려주므로, 그 응답으로 상태를 맞춘다.
    const handleStatusChange = async (
        newStatus: PropertyStatusCode
    ) => {
        if (
            !property ||
            property.status === "COMPLETED" ||
            property.status === "CANCELLED"
        ) {
            return;
        }

        const response = await customAxios.patch<PropertyResponse>(
            `/property/${property.id}/status`,
            { status: newStatus }
        );

        setProperty({
            ...property,
            status: response.data.status,
        });
    };

    // 공개/비공개 전환. 백엔드가 현재 값을 반전시켜서 돌려주므로 body 없이 호출한다.
    const togglePublic = async () => {
        if (!property) return;

        const response =
            await customAxios.patch<PropertyResponse>(
                `/property/${property.id}/visibility`
            );

        setProperty({
            ...property,
            visible: response.data.visible,
        });
    };

    // 등록 취소 (되돌릴 수 없어서 한 번 더 확인). 전용 /cancel 엔드포인트를 쓴다 (body 없음).
    const cancelListing = async () => {
        if (!property || property.status === "CANCELLED") return;

        if (
            !window.confirm(
                "정말 매물 등록을 취소하시겠어요? 취소하면 되돌릴 수 없습니다."
            )
        ) {
            return;
        }

        const response =
            await customAxios.patch<PropertyResponse>(
                `/property/${property.id}/cancel`
            );

        setProperty({
            ...property,
            status: response.data.status,
        });
    };

    if (loading) {
        return (
            <main className="section">
                <div className="wrap">불러오는 중...</div>
            </main>
        );
    }

    if (!property) {
        return (
            <main className="section">
                <div className="wrap">
                    매물 정보를 찾을 수 없습니다.
                </div>
            </main>
        );
    }

    const role = user?.role; // undefined(비회원) | "USER" | "BROKER" | "ADMIN"

    const isOwner =
        user?.role === "BROKER" &&
        user.id === property.ownerId; // 이 매물을 등록한 중개인 본인인지

    const aiPrice = getPrimaryAiPrice(property);

    return (
        <main>
            <section className="page-hero">
                <div className="wrap">
                    <div>
                        <div className="eyebrow">
                            Property Detail
                        </div>

                        <h1>{property.name}</h1>

                        <div
                            className="row gap8"
                            style={{ marginTop: 10 }}
                        >
                            {property.priceEvaluation && (
                                <span
                                    className={`status ${
                                        PRICE_EVALUATION_META[
                                            property.priceEvaluation
                                        ].className
                                    }`}
                                >
                                    관리자 시세평가 ·{" "}
                                    {
                                        PRICE_EVALUATION_META[
                                            property.priceEvaluation
                                        ].label
                                    }
                                </span>
                            )}

                            {property.priceStatus && (
                                <span
                                    className={`status ${
                                        property.priceStatus ===
                                        "DOWN"
                                            ? "green"
                                            : "red"
                                    }`}
                                >
                                    가격{" "}
                                    {property.priceStatus ===
                                    "DOWN"
                                        ? "하락"
                                        : "상승"}
                                </span>
                            )}
                        </div>

                        <p
                            className="dim"
                            style={{ marginTop: 10 }}
                        >
                            {property.description}
                        </p>
                    </div>

                    <div className="hero-stat">
                        <span className="mono dim">
                            AI 예상 시세
                        </span>

                        <strong>
                            {formatAiPrice(property)}
                        </strong>
                    </div>
                </div>
            </section>

            <section className="section">
                <div className="wrap">
                    <div className="gallery">
                        {property.images.map((image, i) => (
                            <div
                                className="photo"
                                key={image.id}
                                style={{
                                    backgroundImage: `url('${image.url}')`,
                                }}
                                aria-label={`매물 사진 ${i + 1}`}
                            />
                        ))}
                    </div>

                    <div
                        className="detail-grid"
                        style={{ marginTop: 26 }}
                    >
                        <div className="stack">
                            <section className="card">
                                <div className="section-head">
                                    <div>
                                        <h2>매물 기본정보</h2>
                                    </div>

                                    {role === "ADMIN" && (
                                        <span className="status purple">
                                            등록:{" "}
                                            {
                                                property
                                                    .agencyDetail
                                                    .agentName
                                            }{" "}
                                            공인중개사
                                        </span>
                                    )}
                                </div>

                                <div className="grid-4">
                                    <div>
                                        <span className="xs dim">
                                            전용면적
                                        </span>
                                        <strong
                                            style={{
                                                display:
                                                    "block",
                                            }}
                                        >
                                            {property.area}㎡
                                        </strong>
                                    </div>

                                    <div>
                                        <span className="xs dim">
                                            층수
                                        </span>
                                        <strong
                                            style={{
                                                display:
                                                    "block",
                                            }}
                                        >
                                            {property.floor}층
                                        </strong>
                                    </div>

                                    <div>
                                        <span className="xs dim">
                                            방·욕실
                                        </span>
                                        <strong
                                            style={{
                                                display:
                                                    "block",
                                            }}
                                        >
                                            {
                                                property.roomCount
                                            }{" "}
                                            /{" "}
                                            {
                                                property.bathroomCount
                                            }
                                        </strong>
                                    </div>

                                    <div>
                                        <span className="xs dim">
                                            입주가능일
                                        </span>
                                        <strong
                                            style={{
                                                display:
                                                    "block",
                                            }}
                                        >
                                            {property.moveInDate ||
                                                "즉시 입주"}
                                        </strong>
                                    </div>
                                </div>
                            </section>

                            <section className="card">
                                <div className="section-head">
                                    <div>
                                        <div className="eyebrow">
                                            Linear Regression
                                        </div>
                                        <h2>AI 시세예측</h2>
                                    </div>
                                </div>

                                <div className="ai-band">
                                    <div className="row between">
                                        <div>
                                            <span className="xs dim">
                                                AI 예상 적정 시세
                                            </span>

                                            <strong
                                                style={{
                                                    display:
                                                        "block",
                                                    fontFamily:
                                                        "'IBM Plex Mono',monospace",
                                                    fontSize: 28,
                                                    fontWeight: 600,
                                                    marginTop: 5,
                                                }}
                                            >
                                                {formatAiPrice(
                                                    property
                                                )}
                                            </strong>
                                        </div>

                                        <div
                                            style={{
                                                textAlign:
                                                    "right",
                                            }}
                                        >
                                            <span className="xs dim">
                                                현재 호가
                                            </span>

                                            <strong
                                                style={{
                                                    display:
                                                        "block",
                                                    fontFamily:
                                                        "'IBM Plex Mono',monospace",
                                                    fontSize: 21,
                                                    fontWeight: 600,
                                                    marginTop: 5,
                                                }}
                                            >
                                                {formatPrice(
                                                    property
                                                )}
                                            </strong>
                                        </div>
                                    </div>
                                </div>

                                <div className="bar-chart">
                                    {property.priceHistory.map(
                                        (point, i) => (
                                            <div
                                                key={i}
                                                style={{
                                                    textAlign:
                                                        "center",
                                                }}
                                            >
                                                <div
                                                    className="bar"
                                                    style={{
                                                        height: `${
                                                            (point.price /
                                                                (aiPrice ||
                                                                    1)) *
                                                            100
                                                        }px`,
                                                    }}
                                                />
                                                <span className="xs">
                                                    {
                                                        point.year
                                                    }
                                                </span>
                                            </div>
                                        )
                                    )}
                                </div>
                            </section>

                            <section className="card">
                                <h2>주변환경</h2>

                                <div
                                    className="tags"
                                    style={{ marginTop: 18 }}
                                >
                                    {property.tags.map((tag) => (
                                        <span
                                            className="tag"
                                            key={tag.id}
                                        >
                                            {tag.name}
                                        </span>
                                    ))}
                                </div>
                            </section>

                            {role === "USER" && (
                                <section className="card">
                                    <div className="row between">
                                        <div>
                                            <h3>
                                                이 매물은
                                                어떠셨나요?
                                            </h3>

                                            <p
                                                className="dim"
                                                style={{
                                                    marginTop: 6,
                                                }}
                                            >
                                                선택은 추천
                                                데이터에
                                                반영됩니다.
                                            </p>
                                        </div>

                                        <div className="row gap8">
                                            <button
                                                className="outline-btn"
                                                onClick={() =>
                                                    sendFeedback(
                                                        true
                                                    )
                                                }
                                            >
                                                👍 좋아요
                                            </button>

                                            <button
                                                className="ghost-btn"
                                                onClick={() =>
                                                    sendFeedback(
                                                        false
                                                    )
                                                }
                                            >
                                                👎 싫어요
                                            </button>
                                        </div>
                                    </div>
                                </section>
                            )}

                            <section className="card">
                                <div className="row between">
                                    <h2>한줄평</h2>

                                    <button
                                        className="outline-btn"
                                        onClick={
                                            startWritingReview
                                        }
                                    >
                                        한줄평 작성
                                    </button>
                                </div>

                                {isWritingReview && (
                                    <div
                                        className="soft"
                                        style={{
                                            marginTop: 16,
                                            marginBottom: 16,
                                        }}
                                    >
                                        <select
                                            className="search-box"
                                            style={{
                                                width: 110,
                                                marginBottom: 10,
                                            }}
                                            value={
                                                reviewRating
                                            }
                                            onChange={(e) =>
                                                setReviewRating(
                                                    Number(
                                                        e.target
                                                            .value
                                                    )
                                                )
                                            }
                                        >
                                            {[5, 4, 3, 2, 1].map(
                                                (n) => (
                                                    <option
                                                        key={n}
                                                        value={n}
                                                    >
                                                        {"★".repeat(
                                                            n
                                                        )}
                                                    </option>
                                                )
                                            )}
                                        </select>

                                        <textarea
                                            className="search-box"
                                            rows={2}
                                            placeholder="이 매물에 대한 한줄평을 남겨주세요"
                                            value={
                                                reviewContent
                                            }
                                            onChange={(e) =>
                                                setReviewContent(
                                                    e.target
                                                        .value
                                                )
                                            }
                                            style={{
                                                display:
                                                    "block",
                                                width: "100%",
                                                resize:
                                                    "vertical",
                                            }}
                                        />

                                        <div
                                            className="row"
                                            style={{
                                                justifyContent:
                                                    "flex-end",
                                                gap: 8,
                                                marginTop: 8,
                                            }}
                                        >
                                            <button
                                                className="outline-btn"
                                                onClick={() =>
                                                    setIsWritingReview(
                                                        false
                                                    )
                                                }
                                            >
                                                취소
                                            </button>

                                            <button
                                                className="solid-btn"
                                                onClick={
                                                    submitReview
                                                }
                                            >
                                                등록
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {property.reviews.map(
                                    (review) => (
                                        <div
                                            className="review-item"
                                            key={review.id}
                                        >
                                            <div className="row between">
                                                <span className="rating">
                                                    {"★".repeat(
                                                        review.rating
                                                    )}
                                                    {"☆".repeat(
                                                        5 -
                                                            review.rating
                                                    )}
                                                </span>

                                                <div className="row gap8">
                                                    <span className="xs dim">
                                                        {
                                                            review.createdAt
                                                        }
                                                    </span>

                                                    {user &&
                                                        user.role !==
                                                            "ADMIN" && (
                                                            <Link
                                                                className="outline-btn"
                                                                style={{
                                                                    padding:
                                                                        "4px 10px",
                                                                    fontSize: 11.5,
                                                                    minHeight:
                                                                        "auto",
                                                                }}
                                                                to={`/report/form?reviewId=${
                                                                    review.id
                                                                }&returnTo=${encodeURIComponent(
                                                                    `/property/${property.id}`
                                                                )}`}
                                                            >
                                                                리뷰
                                                                신고
                                                            </Link>
                                                        )}
                                                </div>
                                            </div>

                                            <p
                                                style={{
                                                    marginTop: 7,
                                                }}
                                            >
                                                {
                                                    review.content
                                                }
                                            </p>
                                        </div>
                                    )
                                )}
                            </section>
                        </div>

                        <aside className="detail-side stack">
                            <section className="surface price-panel shadow">
                                <span className="status gray">
                                    {
                                        PROPERTY_STATUS_LABELS[
                                            property.status
                                        ]
                                    }
                                </span>

                                <div className="price">
                                    {
                                        DEAL_TYPE_LABELS[
                                            property.dealType
                                        ]
                                    }{" "}
                                    {formatPrice(property)}
                                </div>

                                <p className="dim">
                                    {property.address} · 관리비{" "}
                                    {property.maintenanceFee}만 원
                                </p>

                                <div
                                    className="divider"
                                    style={{
                                        margin: "18px 0",
                                    }}
                                />

                                {!user && (
                                    <div
                                        className="stack"
                                        style={{ gap: 9 }}
                                    >
                                        <button
                                            className="solid-btn"
                                            onClick={
                                                requireLogin
                                            }
                                        >
                                            중개사 문의
                                        </button>

                                        <button
                                            className="outline-btn"
                                            onClick={
                                                requireLogin
                                            }
                                        >
                                            ♡ 관심매물 저장
                                        </button>
                                    </div>
                                )}

                                {role === "USER" && (
                                    <div
                                        className="stack"
                                        style={{ gap: 9 }}
                                    >
                                        <Link
                                            className="solid-btn"
                                            style={{
                                                justifyContent:
                                                    "center",
                                            }}
                                            to="/inquiry"
                                        >
                                            중개사 문의
                                        </Link>

                                        <button
                                            className="outline-btn"
                                            onClick={
                                                toggleFavorite
                                            }
                                        >
                                            {property.isFavorited
                                                ? "♥ 관심매물 취소"
                                                : "♡ 관심매물 저장"}
                                        </button>
                                    </div>
                                )}

                                {isOwner && (
                                    <div
                                        className="stack"
                                        style={{ gap: 9 }}
                                    >
                                        <Link
                                            className="solid-btn"
                                            style={{
                                                justifyContent:
                                                    "center",
                                            }}
                                            to={`/property/form/${property.id}`}
                                        >
                                            매물 수정
                                        </Link>

                                        <label
                                            className="field"
                                            style={{
                                                marginTop: 0,
                                            }}
                                        >
                                            <span className="xs dim">
                                                매물 상태
                                            </span>

                                            <select
                                                className="search-box"
                                                value={
                                                    property.status
                                                }
                                                disabled={
                                                    property.status ===
                                                    "COMPLETED"
                                                }
                                                onChange={(e) =>
                                                    handleStatusChange(
                                                        e
                                                            .target
                                                            .value as PropertyStatusCode
                                                    )
                                                }
                                            >
                                                <option value="ACTIVE">
                                                    게시중
                                                </option>
                                                <option value="IN_PROGRESS">
                                                    거래진행중
                                                </option>
                                                <option value="COMPLETED">
                                                    거래완료
                                                </option>
                                            </select>
                                        </label>

                                        <button
                                            className="ghost-btn"
                                            onClick={
                                                togglePublic
                                            }
                                        >
                                            {property.visible
                                                ? "비공개"
                                                : "공개"}
                                        </button>

                                        <button
                                            className="danger-btn"
                                            onClick={
                                                cancelListing
                                            }
                                            disabled={
                                                property.status ===
                                                "CANCELLED"
                                            }
                                        >
                                            등록 취소
                                        </button>
                                    </div>
                                )}

                                {role === "ADMIN" && (
                                    <div
                                        className="stack"
                                        style={{ gap: 9 }}
                                    >
                                        <Link
                                            className="solid-btn"
                                            style={{
                                                justifyContent:
                                                    "center",
                                            }}
                                            to={`/property/form/${property.id}`}
                                        >
                                            매물 수정
                                        </Link>

                                        <Link
                                            className="outline-btn"
                                            style={{
                                                justifyContent:
                                                    "center",
                                            }}
                                            to={`/property/edit-request/${property.id}`}
                                        >
                                            수정 요청
                                        </Link>

                                        <button
                                            className="ghost-btn"
                                            onClick={
                                                togglePublic
                                            }
                                        >
                                            {property.visible
                                                ? "비공개"
                                                : "공개"}
                                        </button>

                                        <button
                                            className="danger-btn"
                                            onClick={
                                                cancelListing
                                            }
                                            disabled={
                                                property.status ===
                                                "CANCELLED"
                                            }
                                        >
                                            등록 취소
                                        </button>
                                    </div>
                                )}
                            </section>

                            <section className="card">
                                <div className="row between">
                                    <div>
                                        <span className="status green">
                                            상담 가능
                                        </span>

                                        <h3
                                            style={{
                                                marginTop: 9,
                                            }}
                                        >
                                            {
                                                property
                                                    .agencyDetail
                                                    .name
                                            }
                                        </h3>
                                    </div>
                                </div>

                                <p
                                    className="xs dim"
                                    style={{ marginTop: 8 }}
                                >
                                    담당:{" "}
                                    {
                                        property.agencyDetail
                                            .agentName
                                    }
                                    <br />
                                    등록번호{" "}
                                    {
                                        property.agencyDetail
                                            .registrationNo
                                    }
                                    <br />
                                    {
                                        property.agencyDetail
                                            .address
                                    }
                                    <br />
                                    {
                                        property.agencyDetail
                                            .phone
                                    }
                                </p>

                                <Link
                                    className="outline-btn"
                                    style={{
                                        width: "100%",
                                        marginTop: 14,
                                        justifyContent:
                                            "center",
                                    }}
                                    to={`/agency/${property.agencyId}?propertyName=${encodeURIComponent(
                                        property.name
                                    )}`}
                                >
                                    중개사무소 상세
                                </Link>
                            </section>

                            {(role === "USER" ||
                                role === "BROKER") &&
                                !isOwner && (
                                    <Link
                                        className="danger-btn"
                                        style={{
                                            width: "100%",
                                            justifyContent:
                                                "center",
                                        }}
                                        to={`/report/form?propertyId=${
                                            property.id
                                        }&returnTo=${encodeURIComponent(
                                            `/property/${property.id}`
                                        )}`}
                                    >
                                        허위매물 신고
                                    </Link>
                                )}
                        </aside>
                    </div>
                </div>
            </section>

            {showLoginModal && (
                <div
                    className="login-modal-backdrop"
                    onClick={() =>
                        setShowLoginModal(false)
                    }
                >
                    <div
                        className="login-modal"
                        onClick={(e) =>
                            e.stopPropagation()
                        }
                    >
                        <p>로그인 해주시기 바랍니다.</p>

                        <div
                            className="row"
                            style={{
                                justifyContent: "center",
                                gap: 10,
                            }}
                        >
                            <button
                                className="outline-btn"
                                onClick={() =>
                                    setShowLoginModal(false)
                                }
                            >
                                취소
                            </button>

                            <button
                                className="solid-btn"
                                onClick={() =>
                                    navigate("/member/login")
                                }
                            >
                                로그인 하기
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}

export default PropertyPage;