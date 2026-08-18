import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import customAxios from "../api/axiosInstance";
import type { PropertyResponse } from "../types/Property";
import "../styles/FavoritesPage.css";
import { formatPrice, DEAL_TYPE_LABELS } from "../utils/propertyPrice";

// 거래유형별 배지 색. ListingsPage/ComparePage와 동일한 매핑을 쓴다.
const DEAL_TYPE_BADGE: Record<string, string> = {
    SALE: "green",
    JEONSE: "purple",
    MONTHLY: "orange",
};

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
        return (
            <main>
                <section className="section">
                    <div className="wrap">
                        <p className="muted">불러오는 중...</p>
                    </div>
                </section>
            </main>
        );
    }

    return (
        <main>
            <section className="page-hero">
                <div className="wrap">
                    <div>
                        <div className="eyebrow">Saved Homes</div>
                        <h1>관심목록</h1>
                        <p>
                            찜한 매물 중 같은 거래유형의 매물 2개를 선택해 비교할 수
                            있습니다.
                        </p>
                    </div>
                </div>
            </section>

            <section className="section">
                <div className="wrap">
                    {error && (
                        <div className="favorites-alert danger">{error}</div>
                    )}

                    {favorites.length > 0 && selectedIds.length === 0 && (
                        <div className="favorites-alert guide">
                            비교할 매물 2개를 선택해 주세요.
                        </div>
                    )}

                    {selectedIds.length === 1 && selectedDealType !== null && (
                        <div className="favorites-alert guide">
                            {DEAL_TYPE_LABELS[selectedDealType]} 매물 1개를 더 선택해
                            주세요.
                        </div>
                    )}

                    {selectedIds.length === 2 && (
                        <div className="favorites-alert success">
                            비교할 매물 2개를 모두 선택했습니다.
                        </div>
                    )}

                    {favorites.length === 0 ? (
                        <div className="favorites-alert guide" style={{ marginTop: 16 }}>
                            아직 찜한 매물이 없습니다. 매물 상세 페이지에서 관심매물을
                            저장해 주세요.
                        </div>
                    ) : (
                        <div className="grid-3" style={{ marginTop: 20 }}>
                            {favorites.map((property) => {
                                const isSelected = selectedIds.includes(property.id);

                                // 선택된 카드는 언제든 해제할 수 있어야 한다.
                                // 선택되지 않은 카드만 조건에 따라 비활성화한다.
                                const compareDisabled =
                                    !isSelected &&
                                    (selectedIds.length >= 2 ||
                                        (selectedDealType !== null &&
                                            property.dealType !== selectedDealType));

                                return (
                                    <article
                                        key={property.id}
                                        className={`media-card favorite-card ${
                                            isSelected ? "favorite-card--selected" : ""
                                        }`}
                                    >
                                        {property.images[0] && (
                                            <div
                                                className="photo"
                                                style={{
                                                    backgroundImage: `url('${property.images[0].url}')`,
                                                }}
                                            />
                                        )}

                                        <div className="body">
                                            <div className="row between">
                                                <span
                                                    className={`status ${
                                                        DEAL_TYPE_BADGE[property.dealType] ??
                                                        "gray"
                                                    }`}
                                                >
                                                    {DEAL_TYPE_LABELS[property.dealType]}
                                                </span>

                                                <button
                                                    type="button"
                                                    className="icon-btn favorite-heart"
                                                    onClick={() => removeFavorite(property.id)}
                                                    aria-label="관심매물 해제"
                                                >
                                                    ♥
                                                </button>
                                            </div>

                                            <h3 style={{ marginTop: 12 }}>
                                                {formatPrice(property)}
                                            </h3>

                                            <p className="dim sm" style={{ marginTop: 4 }}>
                                                {property.address} · {property.area}㎡
                                            </p>

                                            {property.tags.length > 0 && (
                                                <div
                                                    className="tags"
                                                    style={{ marginTop: 10 }}
                                                >
                                                    {property.tags.slice(0, 3).map((tag) => (
                                                        <span className="tag" key={tag.id}>
                                                            {tag.name}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}

                                            <div className="compare-select-box">
                                                <label className="check">
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        disabled={compareDisabled}
                                                        onChange={() => toggleCompare(property)}
                                                    />
                                                    {isSelected ? "비교 선택됨" : "비교 선택"}
                                                </label>

                                                {compareDisabled && selectedIds.length < 2 && (
                                                    <div
                                                        className="xs dim"
                                                        style={{ marginTop: 4 }}
                                                    >
                                                        같은 거래유형만 비교할 수 있습니다.
                                                    </div>
                                                )}
                                            </div>

                                            <Link
                                                to={`/property/${property.id}`}
                                                className="solid-btn favorite-detail-btn"
                                            >
                                                상세 보기
                                            </Link>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    )}

                    {favorites.length > 0 && (
                        <div className="compare-selection-bar">
                            <div>
                                <strong>비교할 매물 {selectedIds.length} / 2</strong>
                                <div className="xs dim">
                                    같은 거래유형의 관심매물 2개를 선택하세요.
                                </div>
                            </div>

                            <button
                                type="button"
                                className="solid-btn"
                                disabled={selectedIds.length !== 2}
                                onClick={goToCompare}
                            >
                                선택 매물 비교
                            </button>
                        </div>
                    )}
                </div>
            </section>
        </main>
    );
}

export default FavoritesPage;
