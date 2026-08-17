import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
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
// common.css .status 색 클래스(green/orange/purple/red/gray)에 맞춘 매핑.
// 목업(agent-dashboard.html)에서 노출 중=green, 승인 대기=orange, 거래 완료=gray 를 그대로 따르고,
// 거래진행중/등록취소는 목업에 없어서 기존 bootstrap variant(primary/danger)와 가장 가까운 색으로 맞췄다.
const STATUS_COLORS: Record<PropertyStatusCode, string> = {
    PENDING: "orange",
    ACTIVE: "green",
    IN_PROGRESS: "purple",
    COMPLETED: "gray",
    CANCELLED: "red",
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
                        <div className="eyebrow">My Properties</div>
                        <h1>내 매물 관리</h1>
                        <p>등록한 매물의 수정, 상태, 공개 여부를 관리합니다.</p>
                    </div>

                    <Link to="/property/form" className="solid-btn">
                        매물 등록
                    </Link>
                </div>
            </section>

            <section className="section">
                <div className="wrap">
                    {error && (
                        <div className="my-properties-alert danger">{error}</div>
                    )}

                    <div className="toolbar">
                        <input
                            className="search-box"
                            placeholder="매물명 또는 주소 검색"
                            value={keyword}
                            onChange={(e) => setKeyword(e.target.value)}
                        />

                        <select
                            className="search-box"
                            value={statusFilter}
                            onChange={(e) =>
                                setStatusFilter(
                                    e.target.value as PropertyStatusCode | "ALL"
                                )
                            }
                        >
                            <option value="ALL">전체 상태</option>
                            {(Object.keys(STATUS_LABELS) as PropertyStatusCode[]).map(
                                (code) => (
                                    <option value={code} key={code}>
                                        {STATUS_LABELS[code]}
                                    </option>
                                )
                            )}
                        </select>
                    </div>

                    {!error && filtered.length === 0 ? (
                        <div className="my-properties-alert guide">
                            조건에 맞는 매물이 없습니다.
                        </div>
                    ) : (
                        <div className="table-wrap">
                            <table className="my-properties-table">
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
                                            <div className="row gap12">
                                                {property.images[0] && (
                                                    <img
                                                        src={property.images[0].url}
                                                        alt={property.name}
                                                        className="my-properties-thumb"
                                                    />
                                                )}
                                                <div>
                                                    <div style={{ fontWeight: 600 }}>
                                                        {property.name}
                                                    </div>
                                                    <div className="xs dim">
                                                        {property.address}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>{DEAL_TYPE_LABELS[property.dealType]}</td>
                                        <td className="num">{formatPrice(property)}</td>
                                        <td>
                                                <span
                                                    className={`status ${
                                                        STATUS_COLORS[property.status]
                                                    }`}
                                                >
                                                    {STATUS_LABELS[property.status]}
                                                </span>
                                            {!property.visible && (
                                                <span
                                                    className="status gray"
                                                    style={{ marginLeft: 6 }}
                                                >
                                                        비공개
                                                    </span>
                                            )}
                                        </td>
                                        <td>{property.createdAt?.slice(0, 10)}</td>
                                        <td>
                                            <Link
                                                to={`/property/form/${property.id}`}
                                                className="outline-btn my-properties-action-btn"
                                            >
                                                수정
                                            </Link>
                                            <Link
                                                to={`/property/${property.id}`}
                                                className="ghost-btn my-properties-action-btn"
                                            >
                                                관리
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </section>
        </main>
    );
}

export default MyPropertiesPage;
