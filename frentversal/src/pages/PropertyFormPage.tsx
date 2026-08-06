import { useState, useEffect } from "react";
import axios from "axios";
import customAxios from "../api/axiosInstance";
import { API_BASE_URL } from "../config/config";
import { useNavigate } from "react-router-dom";
import type { Property } from "../types/Property";
import "../constants/PropertyFormPage.css"; // 페이지명과 동일한 css

const STEPS = ["기본 정보", "가격·계약", "사진", "주변 시설·옵션", "AI 시세 확인", "관리자 승인 요청"];

const NUMBER_FIELDS = ["price", "area", "floor", "roomCount", "bathroomCount", "maintenanceFee"];

const initial_value: Property = {
    name: "", description: "", propertyType: "원/투룸", dealType: "전세",
    address: "", area: 0, floor: 0, roomCount: 0, bathroomCount: 0,
    price: 0, maintenanceFee: 0, maintenanceIncludes: [],
    moveInDate: "", contractStatus: "즉시 계약 가능",
    photos: [], options: [], detailDescription: "",
};

function PropertyFormPage() {
    const navigate = useNavigate();
    const [step, setStep] = useState(0);

    // property는 등록하고자 하는 매물의 정보 (ProductInsertForm의 product와 같은 역할)
    const [property, setProperty] = useState<Property>(initial_value);

    // 필드별 오류 메시지 (백엔드 응답의 필드별 오류를 그대로 매칭)
    const [errors, setErrors] = useState<Record<string, string>>({});

    interface AiEstimate {
        estimatedPrice: number; // AI 예상 시세(만 원)
        diffPercent: number;    // 입력 가격과의 차이(%), 음수면 예상보다 낮음
    }

    const [aiEstimate, setAiEstimate] = useState<AiEstimate | null>(null);
    const [aiLoading, setAiLoading] = useState(false);

// step이 4(AI 시세 확인)가 되면 한 번만 서버에 조회 요청
    useEffect(() => {
        if (step !== 4 || aiEstimate) return;

        const fetchEstimate = async () => {
            setAiLoading(true);
            try {
                const response = await customAxios.get<AiEstimate>(`${API_BASE_URL}/ai/estimate`, {
                    params: { address: property.address, area: property.area, dealType: property.dealType },
                    timeout: 15000, // AI 추론 대기 시간 고려해서 여유 있게
                });
                setAiEstimate(response.data);
            } catch (error) {
                console.error(error);
            } finally {
                setAiLoading(false);
            }
        };

        fetchEstimate();
    }, [step]);

    // input, textarea, select 공통 변경 핸들러 (ProductInsertForm의 ControlChange와 동일 패턴)
    const ControlChange = (
        event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => {
        const { name, value } = event.target;
        const isNumber = NUMBER_FIELDS.includes(name);
        setProperty({ ...property, [name]: isNumber ? Number(value) : value });
    };

    // 체크박스·칩처럼 배열 값을 토글하는 핸들러
    const toggleArrayValue = (field: "maintenanceIncludes" | "options", value: string) => {
        setProperty((prev) => {
            const list = prev[field];
            const next = list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
            return { ...prev, [field]: next };
        });
    };

// 사진 선택 시 바로 백엔드로 업로드 (백엔드가 S3에 올리고 URL을 응답으로 돌려줌)
    const FileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const { files } = event.target;
        if (!files || files.length === 0) {
            alert("사진을 선택해 주셔야 합니다.");
            return;
        }

        for (const file of Array.from(files)) {
            const formData = new FormData();
            formData.append("file", file); // 스프링부트 @RequestParam("file") MultipartFile과 이름 맞추기

            try {
                const response = await customAxios.post<{ url: string }>(
                    `${API_BASE_URL}/property/photo`,
                    formData,
                    { headers: { "Content-Type": "multipart/form-data" } }
                );
                // 업로드 성공 시 받은 S3 URL을 photos 배열에 추가
                setProperty((prev) => ({ ...prev, photos: [...prev.photos, response.data.url] }));
            } catch (error) {
                console.error(error);
                alert("사진 업로드에 실패했습니다.");
            }
        }
    };

// 업로드된 사진 미리보기에서 삭제
    const removePhoto = (index: number) => {
        setProperty((prev) => ({ ...prev, photos: prev.photos.filter((_, i) => i !== index) }));
    };

    // 관리자 승인 요청 (ProductInsertForm의 SubmitAction과 동일 패턴)
    const handleSubmit = async () => {
        try {
            const url = `${API_BASE_URL}/property/insert`;
            const config = { headers: { "Content-Type": "application/json" } };
            const response = await customAxios.post(url, property, config);

            console.log("응답 데이터:", response.data);
            alert("관리자 승인 요청을 보냈습니다.");
            navigate("/agent/dashboard");
        } catch (error: unknown) {
            if (axios.isAxiosError(error) && error.response) {
                setErrors((prev) => ({
                    ...prev,
                    ...error.response?.data?.errors,
                    general: error.response?.data?.message || "매물 등록 중 오류가 발생했습니다.",
                }));
            } else {
                setErrors({ general: "서버와의 통신 중 오류가 발생했습니다." });
            }
        }
    };

    // 임시 저장 (승인 요청 없이 draft로만 저장)
    const handleDraftSave = async () => {
        await customAxios.post(`${API_BASE_URL}/property/draft`, property);
        alert("임시 저장했습니다.");
    };

    return (
        <div className="app-layout">
            <aside className="sidebar">
                <div className="side-nav">
                    {STEPS.map((label, i) => (
                        <button key={i} className={i === step ? "on" : ""} onClick={() => setStep(i)}>
                            {i + 1}. {label}
                        </button>
                    ))}
                </div>
            </aside>

            <div className="stack">
                {errors.general && <p className="error">{errors.general}</p>}

                {step === 0 && (
                    <section className="card">
                        <h2>1. 기본 정보</h2>

                        <div className="field">
                            <label>매물명</label>
                            <input
                                name="name"
                                placeholder="매물을 특정할 수 있는 이름"
                                value={property.name}
                                onChange={ControlChange}
                            />
                        </div>

                        <div className="field">
                            <label>소개 글</label>
                            <textarea
                                name="description"
                                placeholder="매물의 특징과 장점을 간단히 소개하세요"
                                value={property.description}
                                onChange={ControlChange}
                            />
                        </div>

                        <div className="fields-2">
                            <div className="field">
                                <label>매물 유형</label>
                                <select name="propertyType" value={property.propertyType} onChange={ControlChange}>
                                    <option>원/투룸</option>
                                    <option>아파트</option>
                                    <option>주택/빌라</option>
                                    <option>오피스텔</option>
                                </select>
                            </div>
                            <div className="field">
                                <label>거래 유형</label>
                                <select name="dealType" value={property.dealType} onChange={ControlChange}>
                                    <option>매매</option>
                                    <option>전세</option>
                                    <option>월세</option>
                                </select>
                            </div>
                        </div>

                        <div className="field">
                            <label>주소</label>
                            <input
                                name="address"
                                placeholder="도로명 주소 검색"
                                value={property.address}
                                onChange={ControlChange}
                            />
                        </div>

                        <div className="fields-2">
                            <div className="field">
                                <label>전용면적(㎡)</label>
                                <input
                                    name="area"
                                    type="number"
                                    placeholder="84"
                                    value={property.area}
                                    onChange={ControlChange}
                                />
                            </div>
                            <div className="field">
                                <label>층수</label>
                                <input
                                    name="floor"
                                    type="number"
                                    placeholder="12"
                                    value={property.floor}
                                    onChange={ControlChange}
                                />
                            </div>
                        </div>

                        <div className="fields-2">
                            <div className="field">
                                <label>방 개수</label>
                                <input
                                    name="roomCount"
                                    type="number"
                                    placeholder="3"
                                    value={property.roomCount}
                                    onChange={ControlChange}
                                />
                            </div>
                            <div className="field">
                                <label>욕실 개수</label>
                                <input
                                    name="bathroomCount"
                                    type="number"
                                    placeholder="2"
                                    value={property.bathroomCount}
                                    onChange={ControlChange}
                                />
                            </div>
                        </div>
                    </section>
                )}

                {step === 1 && (
                    <section className="card">
                        <h2>2. 가격·계약</h2>
                        <div className="fields-2">
                            <div className="field">
                                <label>가격(만 원)</label>
                                <input name="price" type="number" value={property.price} onChange={ControlChange} />
                            </div>
                            <div className="field">
                                <label>관리비(만 원)</label>
                                <input name="maintenanceFee" type="number" value={property.maintenanceFee} onChange={ControlChange} />
                            </div>
                        </div>
                        <div className="field">
                            <label>관리비 포함 항목</label>
                            <div className="chip-group">
                                {["수도", "인터넷", "TV", "공용관리비", "엘리베이터", "기타"].map((item) => (
                                    <label key={item} className="check">
                                        <input
                                            type="checkbox"
                                            checked={property.maintenanceIncludes.includes(item)}
                                            onChange={() => toggleArrayValue("maintenanceIncludes", item)}
                                        />
                                        {item}
                                    </label>
                                ))}
                            </div>
                        </div>
                        <div className="fields-2">
                            <div className="field">
                                <label>입주 가능일</label>
                                <input name="moveInDate" type="date" value={property.moveInDate} onChange={ControlChange} />
                            </div>
                            <div className="field">
                                <label>계약 가능 상태</label>
                                <select name="contractStatus" value={property.contractStatus} onChange={ControlChange}>
                                    <option>즉시 계약 가능</option>
                                    <option>협상 후 결정</option>
                                </select>
                            </div>
                        </div>
                    </section>
                )}

                {step === 2 && (
                    <section className="card">
                        <h2>3. 사진</h2>
                        <div className="upload-zone">
                            <input type="file" multiple accept="image/*" onChange={FileSelect} />
                        </div>
                        <div className="photo-preview-list">
                            {property.photos.map((url, i) => (
                                <div key={i} className="photo-preview">
                                    <img src={url} alt={`매물 사진 ${i + 1}`} />
                                    <button type="button" onClick={() => removePhoto(i)}>삭제</button>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {step === 3 && (
                    <section className="card">
                        <h2>4. 주변 시설·옵션</h2>
                        <div className="chip-group">
                            {["주차 가능", "엘리베이터", "반려동물", "남향", "풀옵션", "즉시 입주"].map((item) => (
                                <button
                                    key={item}
                                    type="button"
                                    className={property.options.includes(item) ? "filter-chip on" : "filter-chip"}
                                    onClick={() => toggleArrayValue("options", item)}
                                >
                                    {item}
                                </button>
                            ))}
                        </div>
                        <div className="field">
                            <label>상세 설명</label>
                            <textarea
                                name="detailDescription"
                                value={property.detailDescription}
                                onChange={ControlChange}
                            />
                        </div>
                    </section>
                )}

                {step === 4 && (
                    <section className="card">
                        <h2>5. AI 시세 확인</h2>
                        <div className="ai-band">
                            <div className="row between">
                                {aiLoading && <p>AI 시세를 분석하고 있습니다...</p>}
                                {aiEstimate && (
                                    <div>
                                        <strong>AI 예상 시세 {aiEstimate.estimatedPrice.toLocaleString()}만 원</strong>
                                        <p className="xs dim">
                                            입력 가격 {property.price.toLocaleString()}만 원은 예상 시세보다 약{" "}
                                            {Math.abs(aiEstimate.diffPercent)}%{" "}
                                            {aiEstimate.diffPercent < 0 ? "낮습니다" : "높습니다"}.
                                            위치와 매물 유형에 키워드를 적용해 최종 산출했습니다.
                                        </p>
                                    </div>
                                )}
                                <a className="outline-btn" href="/report">분석 근거</a>
                            </div>
                        </div>
                    </section>
                )}

                {step === 5 && (
                    <section className="card">
                        <h2>6. 관리자 승인 요청</h2>
                        <p className="muted">
                            승인 요청을 보내면 관리자 검토 후 승인되어야 매물 등록이 완료되고
                            메인·지도에 노출됩니다.
                        </p>
                    </section>
                )}

                <div className="row" style={{ justifyContent: "flex-end" }}>
                    <button className="ghost-btn" onClick={handleDraftSave}>임시 저장</button>
                    <button className="solid-btn" onClick={handleSubmit}>관리자 승인 요청</button>
                </div>
            </div>
        </div>
    );
}

export default PropertyFormPage;