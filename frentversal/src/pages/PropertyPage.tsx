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
// 관리자는 자기 중개사무소가 없어서 중개인용 /property/** 경로를 통과할 수 없다.
// 그래서 공개 전환·등록 취소는 관리자 전용 경로(/admin/properties/**)로 부른다.
import { cancelProperty, hideProperty, unhideProperty } from "../api/adminApi";
import { getMyEditRequests } from "../api/myAgencyApi";
import type { PropertyEditRequest } from "../types/PropertyEditRequest";
import { getPropertyPriceTrend } from "../api/propertyPriceTrendApi";
import type { PropertyPriceTrend } from "../types/PropertyPriceTrend";

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

    // 중개인·관리자 전용 버튼(상태 변경, 공개 전환, 등록 취소)의 처리 결과.
    // 예전에는 예외 처리가 없어서 권한·상태 때문에 실패해도 화면이 아무 반응을 하지 않았다.
    const [actionMessage, setActionMessage] = useState("");
    const [actionError, setActionError] = useState("");

    // 이 매물에 걸려 있는 관리자 수정 요청 (매물을 등록한 중개인에게만 보인다).
    // 중개인이 매물을 수정하면 서버가 처리 완료로 바꾸므로 목록에서 저절로 빠진다.
    const [editRequests, setEditRequests] = useState<PropertyEditRequest[]>([]);

    /*
      AI 시세예측 그래프 자료.

      국토부 아파트 매매 실거래가가 있으면 연도별 추이를, 없으면 같은 조건 매물과의
      시세 비교를 서버가 골라서 내려 준다. 무엇을 근거로 만든 값인지는 응답의 source 로 온다.
      미리보기(mockData)는 아직 저장되지 않은 매물이라 부를 대상이 없다.
    */
    const [priceTrend, setPriceTrend] = useState<PropertyPriceTrend | null>(null);
    const [trendLoading, setTrendLoading] = useState(!mockData);

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

    /*
      시세 그래프 자료를 가져온다.

      실패해도 매물 상세는 그려져야 하므로 여기서 예외를 삼키고 빈 상태로 둔다.
      그래프 자리는 안내 문구가 대신 채운다.
    */
    useEffect(() => {
        if (!viewedPropertyId) return;

        let alive = true;

        setTrendLoading(true);

        getPropertyPriceTrend(viewedPropertyId)
            .then((data) => {
                if (alive) setPriceTrend(data);
            })
            .catch((error) => {
                console.error("시세 그래프 자료 조회 실패:", error);
                if (alive) setPriceTrend(null);
            })
            .finally(() => {
                if (alive) setTrendLoading(false);
            });

        // 다른 매물로 옮겨 갈 때 늦게 도착한 응답이 화면을 덮어쓰지 않도록 막는다
        return () => {
            alive = false;
        };
    }, [viewedPropertyId]);

    /*
      이 매물에 걸려 있는 관리자 수정 요청을 가져온다.

      매물을 등록한 중개인에게만 보인다. 요청 사유는 관리자가 내부용으로 적는 글이라
      조회 경로도 중개인 전용(/my-agency/**)이다.
      실패해도 매물 상세는 그려져야 하므로 여기서 예외를 삼키고 빈 목록으로 둔다.
    */
    const ownerId = property?.ownerId;

    useEffect(() => {
        // 매물이 바뀔 때만 다시 읽는다. property 객체 전체를 의존성에 넣으면
        // 공개 전환 같은 버튼을 누를 때마다(setProperty) 불필요하게 다시 조회한다.
        if (!user || user.role !== "BROKER" || !viewedPropertyId || user.id !== ownerId) {
            return;
        }

        let alive = true;

        getMyEditRequests(true)
            .then((list) => {
                if (!alive) return;
                setEditRequests(list.filter((item) => item.propertyId === viewedPropertyId));
            })
            .catch((error) => {
                console.error("매물 수정 요청 조회 실패:", error);
                if (alive) setEditRequests([]);
            });

        // 다른 매물로 옮겨 갈 때 늦게 도착한 응답이 화면을 덮어쓰지 않도록 막는다
        return () => {
            alive = false;
        };
    }, [user, viewedPropertyId, ownerId]);

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

    // 서버가 준 오류 메시지를 그대로 보여 준다.
    // 메시지가 없으면(네트워크 오류 등) 넘겨받은 기본 문구를 쓴다.
    const showActionError = (error: unknown, fallback: string) => {
        console.error(fallback, error);

        const message = (error as {
            response?: { data?: { message?: string } };
        })?.response?.data?.message;

        setActionMessage("");
        setActionError(message ?? fallback);
    };

    // 거래 상태 변경 (게시중/거래진행중/거래완료). 거래완료·등록취소는 되돌릴 수 없음.
    // 백엔드가 갱신된 매물 전체를 돌려주므로, 그 응답으로 상태를 맞춘다.
    // 이 기능은 매물을 등록한 중개인 전용이라 관리자 화면에는 나오지 않는다.
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

        try {
            const response = await customAxios.patch<PropertyResponse>(
                `/property/${property.id}/status`,
                { status: newStatus }
            );

            setProperty({
                ...property,
                status: response.data.status,
            });

            setActionError("");
            setActionMessage("매물 상태를 변경했습니다.");
        } catch (error) {
            showActionError(error, "매물 상태를 변경하지 못했습니다.");
        }
    };

    /*
      공개/비공개 전환.

      부르는 경로가 역할에 따라 다르다.
        중개인 : PATCH /property/{id}/visibility    — 서버가 현재 값을 반전시켜 돌려준다
        관리자 : PATCH /admin/properties/{id}/hide | /unhide

      관리자에게는 중개사무소가 없어서 중개인용 경로의 "내 사무소 매물이 맞는지" 검사를
      통과할 수 없다(SecurityConfig 도 PATCH /property/** 를 중개인에게만 연다).
      그래서 관리자는 관리자 전용 경로를 쓴다.
    */
    const togglePublic = async () => {
        if (!property) return;

        try {
            if (user?.role === "ADMIN") {
                const result = property.visible
                    ? await hideProperty(property.id)
                    : await unhideProperty(property.id);

                setProperty({
                    ...property,
                    visible: result.property.visible,
                });

                setActionError("");
                setActionMessage(result.message);
                return;
            }

            const response = await customAxios.patch<PropertyResponse>(
                `/property/${property.id}/visibility`
            );

            setProperty({
                ...property,
                visible: response.data.visible,
            });

            setActionError("");
            setActionMessage(
                response.data.visible
                    ? "매물을 다시 공개했습니다."
                    : "매물을 비공개로 전환했습니다."
            );
        } catch (error) {
            showActionError(error, "공개 여부를 변경하지 못했습니다.");
        }
    };

    /*
      등록 취소 (되돌릴 수 없어서 한 번 더 확인).

      공개 전환과 같은 이유로 경로가 역할에 따라 갈린다.
        중개인 : PATCH /property/{id}/cancel
        관리자 : PATCH /admin/properties/{id}/cancel
    */
    const cancelListing = async () => {
        if (!property || property.status === "CANCELLED") return;

        if (
            !window.confirm(
                "정말 매물 등록을 취소하시겠어요? 취소하면 되돌릴 수 없습니다."
            )
        ) {
            return;
        }

        try {
            if (user?.role === "ADMIN") {
                const result = await cancelProperty(property.id);

                setProperty({
                    ...property,
                    status: result.property.status as PropertyStatusCode,
                });

                setActionError("");
                setActionMessage(result.message);
                return;
            }

            const response = await customAxios.patch<PropertyResponse>(
                `/property/${property.id}/cancel`
            );

            setProperty({
                ...property,
                status: response.data.status,
            });

            setActionError("");
            setActionMessage("매물 등록을 취소했습니다.");
        } catch (error) {
            showActionError(error, "매물 등록을 취소하지 못했습니다.");
        }
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

    /*
      화면에 그릴 관리자 수정 요청.

      editRequests 에는 직전에 보던 매물의 것이 잠깐 남아 있을 수 있으므로,
      지금 매물의 것만 골라 쓴다. 소유자가 아니면 아예 보여 주지 않는다.
    */
    const myEditRequests = isOwner
        ? editRequests.filter((item) => item.propertyId === property.id)
        : [];

    // 막대 높이를 정할 기준값. 값이 하나도 없어도 0 으로 나누지 않도록 최소 1 로 둔다.
    const trendMax = Math.max(1, ...(priceTrend?.points.map((point) => point.price) ?? [0]));

    // 만원 단위 숫자를 "4억 9,000" 형태의 짧은 문구로 바꾼다 (막대 위에 얹는 값).
    const toShortMoney = (manwon: number): string => {
        const eok = Math.floor(manwon / 10000);
        const rest = manwon % 10000;

        if (eok > 0 && rest > 0) return `${eok}억 ${rest.toLocaleString()}`;
        if (eok > 0) return `${eok}억`;

        return rest.toLocaleString();
    };

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

                                {/*
                                  그래프.

                                  막대 높이는 가장 큰 값을 기준으로 잡는다. 예전에는 AI 예상가를
                                  기준으로 나눠서, 예상가보다 비싼 값이 들어오면 차트를 넘쳤다.
                                */}
                                {trendLoading && (
                                    <p className="xs dim property-trend-empty">
                                        시세 자료를 불러오는 중입니다…
                                    </p>
                                )}

                                {!trendLoading && (!priceTrend || priceTrend.source === "NONE") && (
                                    <p className="xs dim property-trend-empty">
                                        {priceTrend?.description
                                            ?? "이 매물과 비교할 시세 자료가 아직 없습니다."}
                                    </p>
                                )}

                                {!trendLoading && priceTrend && priceTrend.source !== "NONE" && (
                                    <>
                                        <div className="property-trend-head">
                                            <strong>{priceTrend.title}</strong>
                                            {priceTrend.description && (
                                                <span className="xs dim">
                                                    {priceTrend.description}
                                                </span>
                                            )}
                                        </div>

                                        {/*
                                          .property-trend-plot 은 칸마다 높이가 똑같이 고정된 상자다.
                                          막대는 그 상자 안에서만 바닥에 붙으므로, 아래 이름표가
                                          두 줄이 되어 길어져도 막대 시작점(바닥선)은 흔들리지 않는다.
                                          이름표는 상자 바깥, 일반 흐름에 놓여 아래로만 늘어난다.
                                        */}
                                        <div className="bar-chart property-bar-chart">
                                            {priceTrend.points.map((point, i) => (
                                                <div
                                                    className="property-trend-col"
                                                    key={`${point.label}-${i}`}
                                                >
                                                    <div className="property-trend-plot">
                                                        <span className="property-trend-value">
                                                            {toShortMoney(point.price)}
                                                        </span>

                                                        <div
                                                            className={`bar${point.current ? " current" : ""}`}
                                                            style={{
                                                                height: `${(point.price / trendMax) * 78}px`,
                                                            }}
                                                            title={
                                                                point.count
                                                                    ? `${point.label} · ${point.price.toLocaleString()}만 원 · ${point.count}건`
                                                                    : `${point.label} · ${point.price.toLocaleString()}만 원`
                                                            }
                                                        />
                                                    </div>

                                                    <span className="xs property-trend-label">
                                                        {point.label}
                                                        {point.count ? ` (${point.count})` : ""}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}
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
                                            to={`/agency/${property.agencyId}?propertyId=${property.id}`}
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
                                        {/* 관리자가 보낸 수정 요청. 이 매물을 수정하면 서버가 처리 완료로 바꾼다. */}
                                        {myEditRequests.length > 0 && (
                                            <div className="property-editreq">
                                                <span className="status orange">
                                                    관리자 수정 요청 {myEditRequests.length}건
                                                </span>

                                                {myEditRequests.map((item) => (
                                                    <div key={item.id}>
                                                        <p className="property-editreq-reason">
                                                            {item.reason}
                                                        </p>

                                                        <p className="xs dim">
                                                            {item.requesterName} · {item.createdAt}
                                                        </p>
                                                    </div>
                                                ))}

                                                <p className="xs dim">
                                                    아래 매물 수정에서 내용을 고치면 요청이 처리 완료됩니다.
                                                </p>
                                            </div>
                                        )}

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

                                        {actionError && (
                                            <p className="xs property-action-error">
                                                {actionError}
                                            </p>
                                        )}

                                        {actionMessage && (
                                            <p className="xs property-action-message">
                                                {actionMessage}
                                            </p>
                                        )}
                                    </div>
                                )}

                                {role === "ADMIN" && (
                                    <div
                                        className="stack"
                                        style={{ gap: 9 }}
                                    >
                                        {/* 관리자가 직접 고친다. 중개인 수정과 달리 승인 대기로 되돌아가지 않는다. */}
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

                                        {/* 매물은 그대로 두고 중개인에게 고칠 점만 알린다 */}
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
                                                ? "비공개 처리"
                                                : "공개로 전환"}
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

                                        {actionError && (
                                            <p className="xs property-action-error">
                                                {actionError}
                                            </p>
                                        )}

                                        {actionMessage && (
                                            <p className="xs property-action-message">
                                                {actionMessage}
                                            </p>
                                        )}
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