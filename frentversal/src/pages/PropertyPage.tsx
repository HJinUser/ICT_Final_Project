import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
// customAxios 는 baseURL 이 이미 "/api" 라서, 요청 주소는 "/property/1" 처럼 그 뒤만 적는다.
// 여기에 API_BASE_URL 을 또 붙이면 "/api/api/property/1" 이 되어 서버가 못 알아듣는다.
import customAxios from "../api/axiosInstance";
import ThumbIcon from "./components/ThumbIcon";
import type { User } from "../types/User";
import type { PropertyDetail } from "../types/PropertyDetail";
import { PROPERTY_STATUS_LABELS } from "../types/PropertyDetail";
import type { PropertyResponse, PropertyStatusCode } from "../types/Property";
import type { AgencyDetail } from "../types/Agency";
import type { Review } from "../types/Review";
import "../styles/PropertyPage.css";
import { DEAL_TYPE_LABELS } from "../utils/propertyPrice.ts";
import PropertyLocationMap from "./components/PropertyLocationMap";
import PhotoLightbox from "./components/PhotoLightbox";
import StarRatingInput from "./components/StarRatingInput";
import { getPropertyReviews, savePropertyReview } from "../api/propertyReviewApi";

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
        return `${(property.monthlyDeposit ?? 0).toLocaleString()}만 원/${(property.monthlyRent ?? 0).toLocaleString()}만 원`;
    }
    return `${getPrimaryPrice(property).toLocaleString()}만 원`;
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

    // 크게 보고 있는 사진의 순번. null 이면 닫힌 상태다.
    const [photoIndex, setPhotoIndex] = useState<number | null>(null);
    const [loading, setLoading] = useState(!mockData);

    const [showLoginModal, setShowLoginModal] = useState(false);

    const [isWritingReview, setIsWritingReview] = useState(false);
    const [reviewRating, setReviewRating] = useState(5);
    const [reviewSaving, setReviewSaving] = useState(false);
    const [reviewError, setReviewError] = useState("");
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

                // 한줄평은 비회원도 볼 수 있다. 실패해도 상세 화면은 그려져야 하므로 여기서 삼킨다.
                let reviews: Review[] = [];

                try {
                    reviews = await getPropertyReviews(propertyResponse.data.id);
                } catch (error) {
                    console.error("한줄평 조회 실패:", error);
                }

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
                    reviews,
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

    // 추천 카드의 좋아요/싫어요 선택을 Spring API로 전송하는 함수임
    const sendFeedback = async (liked: boolean) => {
        if (!property) return;

        try {
            // 추천 피드백 API에 매물 ID와 LIKE/DISLIKE 평가값을 전송함
            await customAxios.post('/recommendation/feedback', {
                propertyId: property.id,
                type: liked ? 'LIKE' : 'DISLIKE',
                recommendationScore: null,
                modelVersion: null,
            });

            alert(
                liked
                    ? '좋아요로 추천 데이터에 반영했습니다.'
                    : '싫어요로 추천 데이터에 반영했습니다.'
            );
        } catch (error) {
            console.error("추천 피드백 전송 실패:", error);
            alert("평가 전송 중 오류가 발생했습니다.");
        }
    };

    const startWritingReview = () => {
        if (!user) {
            requireLogin();
            return;
        }

        setIsWritingReview(true);
    };

    /*
      한줄평 등록.

      같은 매물에 이미 쓴 글이 있으면 서버가 새로 만들지 않고 그 글을 고친다.
      그래서 응답을 목록 앞에 끼워 넣지 않고 목록을 다시 읽는다.
      끼워 넣으면 고쳐 쓴 글이 두 번 보인다.
    */
    const submitReview = async () => {
        if (!property || reviewSaving) return;

        if (reviewRating < 1) {
            setReviewError("별점을 선택해 주세요.");
            return;
        }

        if (!reviewContent.trim()) {
            setReviewError("한줄평 내용을 입력해 주세요.");
            return;
        }

        setReviewSaving(true);
        setReviewError("");

        try {
            await savePropertyReview(property.id, {
                rating: reviewRating,
                content: reviewContent.trim(),
            });

            const reviews = await getPropertyReviews(property.id);

            setProperty((prev) => (prev ? { ...prev, reviews } : prev));
            setIsWritingReview(false);
            setReviewContent("");
            setReviewRating(5);
        } catch (error) {
            console.error("한줄평 등록 실패:", error);
            // 권한(403)·로그인 만료(401)·서버 오류를 사용자가 알 수 있어야 한다.
            // 예전에는 예외 처리가 없어서 등록을 눌러도 아무 반응이 없었다.
            setReviewError("한줄평을 등록하지 못했습니다. 잠시 후 다시 시도해 주세요.");
        } finally {
            setReviewSaving(false);
        }
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
                                    className={`status ${PRICE_EVALUATION_META[
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
                                    className={`status ${property.priceStatus ===
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

                        <strong className="property-hero-price">
                            {formatAiPrice(property)}
                        </strong>
                    </div>
                </div>
            </section>

            <section className="section">
                <div className="wrap">
                    <div className="gallery">
                        {property.images.map((image, i) => (
                            /* 사진을 누르면 크게 본다. div 가 아니라 button 이라야
                               키보드로도 열 수 있고 화면낭독기가 누를 것으로 읽는다. */
                            <button
                                type="button"
                                className="photo property-photo"
                                key={image.id}
                                style={{
                                    backgroundImage: `url('${image.url}')`,
                                }}
                                aria-label={`매물 사진 ${i + 1} 크게 보기`}
                                onClick={() => setPhotoIndex(i)}
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

                            {/* 위치와 주변시설. 좌표가 없는 매물은 지도를 그릴 수 없으므로 건너뛴다. */}
                            {property.latitude != null && property.longitude != null && (
                                <PropertyLocationMap
                                    propertyId={property.id}
                                    latitude={property.latitude}
                                    longitude={property.longitude}
                                    propertyName={property.name}
                                />
                            )}

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

                                            <strong className="ai-price-main">
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

                                            <strong className="ai-price-sub">
                                                {formatPrice(
                                                    property
                                                )}
                                            </strong>
                                        </div>
                                    </div>
                                </div>

                                <div className="bar-chart property-bar-chart">
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
                                                        // 차트 높이를 줄였으므로 막대 기준값도 함께 줄인다.
                                                        // 그대로 두면 AI 예상가보다 비싼 해의 막대가 차트를 넘친다.
                                                        height: `${(point.price /
                                                                (aiPrice ||
                                                                    1)) *
                                                            78
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
                                                <ThumbIcon />
                                                좋아요
                                            </button>

                                            <button
                                                className="ghost-btn"
                                                onClick={() =>
                                                    sendFeedback(
                                                        false
                                                    )
                                                }
                                            >
                                                <ThumbIcon down />
                                                싫어요
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
                                        {/* 별을 눌러 점수를 고른다. 예전에는 "★★★★" 문자열이 든
                                            드롭다운이었는데, 몇 점인지 세어 봐야 알 수 있었다. */}
                                        <div style={{ marginBottom: 10 }}>
                                            <StarRatingInput
                                                value={reviewRating}
                                                onChange={setReviewRating}
                                            />
                                        </div>

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
                                                disabled={reviewSaving}
                                            >
                                                {reviewSaving ? "등록 중" : "등록"}
                                            </button>
                                        </div>

                                        {reviewError && (
                                            <p className="review-error">
                                                {reviewError}
                                            </p>
                                        )}
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
                                                        {review.writerName}
                                                        {review.mine && " (내 한줄평)"}
                                                        {" · "}
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
                                                                to={`/report/form?reviewId=${review.id
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
                                            to={`/inquiry?propertyId=${property.id}&propertyName=${encodeURIComponent(
                                                property.name
                                            )}&returnTo=${encodeURIComponent(`/property/${property.id}`)}`}
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
                                        to={`/report/form?propertyId=${property.id
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
            <PhotoLightbox
                photos={property.images}
                index={photoIndex}
                onClose={() => setPhotoIndex(null)}
                onChange={setPhotoIndex}
            />
        </main>
    );
}

export default PropertyPage;