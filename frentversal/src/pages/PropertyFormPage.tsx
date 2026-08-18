import { useState, useEffect, useMemo } from "react";
import axios from "axios";
// customAxios 는 baseURL 이 이미 "/api" 라서, 요청 주소는 "/property/insert" 처럼 그 뒤만 적는다.
// 여기에 API_BASE_URL 을 또 붙이면 "/api/api/property/insert" 가 되어 서버가 못 알아듣는다.
import customAxios from "../api/axiosInstance";
import AddressInput from "./components/AddressInput";
import { useNavigate, useParams } from "react-router-dom";
import type { Property, PropertyResponse, PropertyImageResponse } from "../types/Property";
import type { TagResponse } from "../types/Tag";
import "../styles/PropertyFormPage.css"; // 부트스트랩이 못 커버하는 부분만 남긴 커스텀 css

const STEPS = ["기본 정보", "가격·계약", "사진", "태그 선택", "AI 시세 확인", "관리자 승인 요청"];

// 서버는 주소로 좌표를 못 구해도 매물 저장 자체는 성공시키고, latitude/longitude 만 비워서 돌려준다
// (KakaoGeocodingService 참고 — 좌표를 못 구했다고 등록이 실패하면 안 되기 때문이다).
// 그런데 좌표가 없으면 지도 검색에 핀이 찍히지 않는다.
// 아무 말도 안 해 주면 "등록은 됐는데 지도에 왜 안 보이지?" 하고 원인을 찾을 방법이 없어서,
// 저장 직후에 알려 준다.
const NO_COORDINATES_NOTICE =
    "\n\n다만 주소로 위치를 찾지 못해 지도에는 표시되지 않습니다."
    + "\n주소가 정확한지 확인해 주세요. 주소를 고쳐도 계속 이러면 관리자에게 알려 주세요.";

function hasNoCoordinates(saved: PropertyResponse) {
    return saved.latitude == null || saved.longitude == null;
}
const NUMBER_FIELDS = ["price", "deposit", "monthlyDeposit", "monthlyRent", "area", "floor", "roomCount", "bathroomCount", "maintenanceFee", "buildYear"];

// 비워 둘 수 있는 숫자 칸. 빈 값을 0 으로 바꾸지 않고 값 없음으로 남긴다.
const OPTIONAL_NUMBER_FIELDS = ["buildYear"];

// 건축 연도로 넣을 수 있는 범위.
// 위쪽은 아직 다 짓지 않은 건물도 등록할 수 있도록 올해보다 한 해 뒤까지 열어 둔다.
const MIN_BUILD_YEAR = 1900;
const MAX_BUILD_YEAR = new Date().getFullYear() + 1;
const MAX_PHOTOS = 3; // 백엔드 PropertyImageService.MAX_IMAGE_COUNT 와 동일하게 맞춤

// 태그 category(영문 코드) -> 화면에 보여줄 한글 라벨
const TAG_CATEGORY_LABELS: Record<TagResponse["category"], string> = {
    ATMOSPHERE: "분위기",
    LIVING_ENVIRONMENT: "생활환경",
    TRANSPORTATION: "교통편의",
    NATURAL_ENVIRONMENT: "자연환경",
};

// 어느 중개사무소의 매물인지는 보내지 않는다.
// 서버가 로그인한 중개인(JWT)의 사무소로 정하기 때문이다.
// 여기서 보내 봐야 무시되고, 보낼 수 있게 두면 남의 사무소 번호를 넣는 요청도 가능해진다.
// 등록 폼 전용 상태 타입.
// 숫자 칸을 처음부터 0으로 채우면 이어서 타이핑할 때 앞자리 0이 안 지워지고 남는 문제가 있다.
// react_cafe의 ProductInsertForm(price: '')과 같은 이유로, 편집 중에는 숫자 칸에 빈 문자열도
// 허용해 두고 빈 값으로 시작시킨 뒤, 제출 직전(toNumber)에만 실제 숫자로 바꾼다.
type PropertyFormState = Omit<
    Property,
    "area" | "floor" | "roomCount" | "bathroomCount" | "price" | "deposit" | "monthlyDeposit" | "monthlyRent" | "maintenanceFee"
> & {
    area: number | "";
    floor: number | "";
    roomCount: number | "";
    bathroomCount: number | "";
    price?: number | "";
    deposit?: number | "";
    monthlyDeposit?: number | "";
    monthlyRent?: number | "";
    maintenanceFee: number | "";
};

// PropertyFormState의 숫자 칸(빈 문자열일 수 있음)을 실제 숫자로 바꾼다.
// 필수 칸이 비어 있으면 0으로, 선택 칸(price/deposit/monthlyDeposit/monthlyRent)이 비어 있으면
// undefined로 보내서 백엔드의 dealType별 필수값 검증(validatePricingFields)이 그대로 동작하게 한다.
const toNumber = (value: number | "" | undefined): number | undefined =>
    value === "" || value === undefined ? undefined : value;

const initial_value: PropertyFormState = {
    name: "", description: "", type: "ONE_TWO_ROOM", dealType: "JEONSE",
    address: "", area: "", floor: "", roomCount: "", bathroomCount: "",
    maintenanceFee: "",
    moveInDate: "", contractStatus: "IMMEDIATE",
    detailDescription: "", tagIds: [],
};

// 서버 응답(PropertyResponse)을 폼에서 쓰는 요청 형태(PropertyFormState)로 변환. 수정 화면 진입 시 기존 값을 채우는 용도.
// agency는 넣지 않는다 — Property(요청) 타입에 애초에 없는 필드고, 서버도 로그인한 사람 걸로 직접 정하기 때문이다.
const mapResponseToProperty = (data: PropertyResponse): PropertyFormState => ({
    id: data.id,
    neighborhoodId: data.neighborhoodId ?? undefined,
    name: data.name,
    type: data.type,
    dealType: data.dealType,
    address: data.address,
    // 주소를 다시 검색하지 않고 저장해도 동네 정보가 남아 있도록 그대로 들고 간다.
    // 이걸 빠뜨리면 저장할 때 서버로 안 올라가고, 지도에서 동별로 묶이지 않는다.
    sigungu: data.sigungu ?? undefined,
    dong: data.dong ?? undefined,
    area: data.area,
    floor: data.floor,
    roomCount: data.roomCount,
    bathroomCount: data.bathroomCount,
    // 값이 없는 예전 매물은 입력칸을 비워 둔 상태로 연다
    buildYear: data.buildYear ?? undefined,
    price: data.price ?? undefined,
    deposit: data.deposit ?? undefined,
    monthlyDeposit: data.monthlyDeposit ?? undefined,
    monthlyRent: data.monthlyRent ?? undefined,
    maintenanceFee: data.maintenanceFee,
    description: data.description,
    detailDescription: data.detailDescription,
    moveInDate: data.moveInDate ?? "",
    contractStatus: data.contractStatus ?? "IMMEDIATE",
    tagIds: data.tags.map((tag) => tag.id),
});

function PropertyFormPage() {
    const navigate = useNavigate();
    // 주소에 :id가 있으면 수정 화면, 없으면 등록 화면이다 (라우트: /property/form, /property/form/:id)
    const { id } = useParams<{ id: string }>();
    const isEditMode = Boolean(id);

    const [step, setStep] = useState(0);

    // property는 등록/수정하고자 하는 매물의 정보 (ProductInsertForm의 product와 같은 역할)
    const [property, setProperty] = useState<PropertyFormState>(initial_value);

    // 필드별 오류 메시지 (백엔드 응답의 필드별 오류를 그대로 매칭)
    const [errors, setErrors] = useState<Record<string, string>>({});

    // 상세주소(동·호수). 지금은 주소를 한 덩어리로 저장하므로 제출할 때 주소 뒤에 합쳐 보낸다.
    // 나중에 주소를 시·구·동으로 쪼개 저장하게 되면 별도 칸으로 보내면 된다.
    const [addressDetail, setAddressDetail] = useState('');

    // 수정 화면에서 서버가 이미 갖고 있는 사진들. 삭제 버튼을 누르면 이 목록에서만 빠지고,
    // 실제 삭제(저장소 파일 제거)는 제출 시 keepImageIds에 없는 사진들을 서버가 처리한다.
    const [existingImages, setExistingImages] = useState<PropertyImageResponse[]>([]);

    // 사진 파일 자체는 property 객체에 넣지 않고 따로 들고 있다가, 제출할 때 FormData로 합친다
    const [photoFiles, setPhotoFiles] = useState<File[]>([]);
    // 파일마다 미리보기용 blob URL을 만들어 둠. photoFiles가 바뀔 때만 새로 계산
    const photoPreviews = useMemo(
        () => photoFiles.map((file) => URL.createObjectURL(file)),
        [photoFiles]
    );
    // 컴포넌트가 사라지거나 photoPreviews가 새로 만들어질 때, 이전에 만든 blob URL을 메모리에서 해제
    useEffect(() => {
        return () => {
            photoPreviews.forEach((url) => URL.revokeObjectURL(url));
        };
    }, [photoPreviews]);

    // 수정 화면 진입 시 기존 매물 데이터를 불러와 폼을 채운다
    useEffect(() => {
        if (!isEditMode) return;
        const fetchProperty = async () => {
            try {
                const response = await customAxios.get<PropertyResponse>(`/property/${id}`);
                setProperty(mapResponseToProperty(response.data));
                setExistingImages(response.data.images);
            } catch (error) {
                console.error(error);
                alert("매물 정보를 불러오지 못했습니다.");
                navigate(-1);
            }
        };
        fetchProperty();
    }, [id, isEditMode, navigate]);

    // 태그 목록. 서버가 갖고 있는 전체 태그를 받아와서 선택 UI를 그린다
    const [availableTags, setAvailableTags] = useState<TagResponse[]>([]);
    useEffect(() => {
        const fetchTags = async () => {
            try {
                const response = await customAxios.get<TagResponse[]>(`/tag`);
                setAvailableTags(response.data);
            } catch (error) {
                console.error(error);
            }
        };
        fetchTags();
    }, []);

    interface AiEstimate {
        estimatedPrice: number;
        diffPercent: number;
    }
    // 서버 조회가 되살아나면 다시 setState 로 채운다. 지금은 항상 비어 있어 안내 문구가 보인다.
    const [aiEstimate] = useState<AiEstimate | null>(null);
    const [aiLoading] = useState(false);

    // AI 시세 조회(/ai/estimate)는 아직 서버에 없다.
    // 없는 주소로 요청하면 콘솔에 오류만 쌓이고 사용자에게는 아무 설명이 없으므로,
    // 엔드포인트가 생기기 전까지는 요청을 보내지 않고 화면에 안내만 띄운다.
    //
    // 서버가 준비되면 이 자리에서 아래 요청을 되살리면 된다.
    //   const response = await customAxios.get<AiEstimate>('/ai/estimate', {
    //       params: { address: property.address, area: property.area, dealType: property.dealType },
    //   });
    //   setAiEstimate(response.data);

    // input, textarea, select 공통 변경 핸들러.
    // 숫자 필드는 빈 문자열이면 그대로 두고(다시 0으로 채우지 않는다), 값이 있을 때만 Number로 바꾼다.
    const ControlChange = (
        event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => {
        const { name, value } = event.target;
        const isNumber = NUMBER_FIELDS.includes(name);

        /*
          비워 둘 수 있는 숫자 칸은 빈 값을 0 이 아니라 값 없음으로 둔다.

          Number("") 는 0 이라서, 그냥 두면 칸을 비웠을 때 0 이 들어간다.
          건축 연도에 0 이 들어가면 "모름"이 아니라 "서기 0년"이 되어
          서버의 연도 범위 검사에 걸리고 저장 자체가 막힌다.
        */
        if (isNumber && OPTIONAL_NUMBER_FIELDS.includes(name) && value.trim() === "") {
            setProperty({ ...property, [name]: undefined });
            return;
        }

        setProperty({ ...property, [name]: isNumber ? Number(value) : value });
    };

    // 거래유형이 바뀌면 이전 유형에서 쓰던 가격 필드들을 비워준다.
    // (예: 매매→전세로 바꿨는데 price 값이 그대로 남아 있으면 헷갈리고, 백엔드도 deposit만 봄)
    const handleDealTypeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const value = event.target.value as Property["dealType"];
        setProperty((prev) => ({
            ...prev,
            dealType: value,
            price: undefined,
            deposit: undefined,
            monthlyDeposit: undefined,
            monthlyRent: undefined,
        }));
    };

    // 태그 선택/해제 토글
    const toggleTag = (tagId: number) => {
        setProperty((prev) => {
            const current = prev.tagIds ?? [];
            const next = current.includes(tagId)
                ? current.filter((id) => id !== tagId)
                : [...current, tagId];
            return { ...prev, tagIds: next };
        });
    };

    // 사진 선택. 실제 업로드는 안 하고 파일만 들고 있다가 최종 제출(handleSubmit)에서 한 번에 보낸다.
    // 수정 화면에서는 "남아있는 기존 사진 + 새로 고른 사진" 합이 최대치를 넘지 않게 확인한다.
    const FileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const { files } = event.target;
        if (!files || files.length === 0) {
            alert("사진을 선택해 주셔야 합니다.");
            return;
        }
        const selected = Array.from(files);
        if (existingImages.length + photoFiles.length + selected.length > MAX_PHOTOS) {
            alert(`사진은 최대 ${MAX_PHOTOS}장까지 등록할 수 있습니다.`);
            return;
        }
        setPhotoFiles((prev) => [...prev, ...selected]);
        event.target.value = ""; // 같은 파일을 다시 선택할 수 있도록 입력값 초기화
    };

    const removePhoto = (index: number) => {
        setPhotoFiles((prev) => prev.filter((_, i) => i !== index));
    };

    // 기존 사진 삭제. 화면에서만 목록을 빼고, 실제 반영은 제출 시 keepImageIds로 서버에 전달된다.
    const removeExistingImage = (imageId: number) => {
        setExistingImages((prev) => prev.filter((image) => image.id !== imageId));
    };

    // 등록/수정 제출. 백엔드가 멀티파트(consumes = MULTIPART_FORM_DATA_VALUE)로 받으므로
    // "data" 파트엔 JSON, "files" 파트엔 실제 사진 파일들을 담아 FormData로 함께 보낸다.
    // Content-Type 헤더는 직접 지정하지 않는다 — axios가 FormData를 보고 boundary까지 포함해 자동으로 설정해준다.
    const handleSubmit = async () => {
        /*
          건축 연도는 비워 둘 수 있지만, 적었다면 있을 수 있는 연도여야 한다.
          서버도 같은 범위를 확인하지만, 여기서 먼저 막으면 사진까지 올렸다가 되돌아오는 일을 줄일 수 있다.
        */
        if (property.buildYear != null) {
            const year = property.buildYear;

            if (!Number.isInteger(year) || year < MIN_BUILD_YEAR || year > MAX_BUILD_YEAR) {
                setErrors({
                    buildYear: `건축 연도는 ${MIN_BUILD_YEAR}년부터 ${MAX_BUILD_YEAR}년 사이로 입력해 주세요.`,
                    general: `건축 연도는 ${MIN_BUILD_YEAR}년부터 ${MAX_BUILD_YEAR}년 사이로 입력해 주세요.`,
                });
                return;
            }
        }

        try {
            // 수정 화면에서는 "지금까지 남아 있는 기존 사진 id 목록"을 같이 보내야
            // 백엔드가 그 목록에 없는 기존 사진을 지운다 (PropertyService.update 참고)
            // 상세주소는 아직 따로 저장할 칸이 없어서 도로명 주소 뒤에 붙여 한 덩어리로 보낸다.
            const address = [property.address, addressDetail].filter(Boolean).join(' ');

            // PropertyFormState -> Property. 편집 중 빈 문자열이었던 숫자 칸을 여기서만 실제 숫자로 바꾼다.
            const payload: Property = {
                ...property,
                address,
                area: toNumber(property.area) ?? 0,
                floor: toNumber(property.floor) ?? 0,
                roomCount: toNumber(property.roomCount) ?? 0,
                bathroomCount: toNumber(property.bathroomCount) ?? 0,
                maintenanceFee: toNumber(property.maintenanceFee) ?? 0,
                price: toNumber(property.price),
                deposit: toNumber(property.deposit),
                monthlyDeposit: toNumber(property.monthlyDeposit),
                monthlyRent: toNumber(property.monthlyRent),
                ...(isEditMode ? { keepImageIds: existingImages.map((image) => image.id) } : {}),
            };

            const formData = new FormData();
            formData.append("data", new Blob([JSON.stringify(payload)], { type: "application/json" }));
            photoFiles.forEach((file) => formData.append("files", file));

            if (isEditMode) {
                const response = await customAxios.put<PropertyResponse>(`/property/${id}`, formData);
                alert("매물 정보를 수정했습니다."
                    + (hasNoCoordinates(response.data) ? NO_COORDINATES_NOTICE : ""));
                navigate(`/property/${id}`);
            } else {
                const response = await customAxios.post<PropertyResponse>(`/property/insert`, formData);
                alert("관리자 승인 요청을 보냈습니다."
                    + (hasNoCoordinates(response.data) ? NO_COORDINATES_NOTICE : ""));
                navigate("/broker/agency"); // 방금 등록한 매물이 "내 중개사무소 > 요약"에 바로 보인다
            }
        } catch (error: unknown) {
            if (axios.isAxiosError(error) && error.response) {
                // 서버가 돌려주는 400 응답은 두 가지 모양이다.
                //   ① 필드별 검증 오류 : { "name": "매물명은 필수...", "roomCount": "..." }  (본문이 곧 오류 목록)
                //   ② 그 외 오류      : { "message": "등록된 중개사무소가 없습니다." }
                // ①을 data.errors 안에서 찾으면 아무것도 못 찾아 원인이 화면에 안 보인다.
                const { message, ...fieldErrors } = error.response.data ?? {};

                // 입력 칸이 없는 필드(status 등)의 오류도 묻히지 않도록 상단에 함께 보여 준다
                const detail = Object.entries(fieldErrors)
                    .map(([field, text]) => `${field}: ${text}`)
                    .join(" / ");

                setErrors({
                    ...fieldErrors,
                    general: message || detail || "매물 저장 중 오류가 발생했습니다.",
                });
            } else {
                setErrors({ general: "서버와의 통신 중 오류가 발생했습니다." });
            }
        }
    };

    const handleDraftSave = async () => {
        // 임시 저장(/property/draft)은 아직 서버에 없다.
        // 없는 주소로 보내면 오류만 나고 저장된 것처럼 알림이 뜨므로, 준비 중임을 알린다.
        // 엔드포인트가 생기면 아래 한 줄을 되살리면 된다.
        //   await customAxios.post('/property/draft', property);
        alert("임시 저장은 준비 중입니다.");
    };

    return (
        <main>
            <section className="page-hero"><div className="wrap">
                <div>
                    <div className="eyebrow">Property Form</div>
                    <h1>{isEditMode ? "매물 수정" : "매물 등록"}</h1>
                    <p>중개인이 입력한 매물은 저장 후 관리자 승인 대기 상태가 되며 승인된 뒤 메인과 지도에 노출됩니다.</p>
                </div>
                <div className="hero-stat">
                    <span className="mono dim">등록 단계</span>
                    <strong>{step + 1} / {STEPS.length}</strong>
                    <span className="xs dim">{STEPS[step]}</span>
                </div>
            </div></section>

            <section className="section"><div className="wrap">
                {errors.general && <div className="form-alert">{errors.general}</div>}

                <div className="app-layout">
                    <aside className="sidebar">
                        <div className="side-title">등록 순서</div>
                        <div className="side-nav">
                            {STEPS.map((label, i) => (
                                <button
                                    key={i}
                                    type="button"
                                    className={i === step ? "on" : ""}
                                    onClick={() => setStep(i)}
                                >
                                    {i + 1}. {label}
                                </button>
                            ))}
                        </div>
                        <div className="side-note">임시 저장 후 나중에 이어서 작성할 수 있습니다.</div>
                    </aside>

                    <div className="stack">
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
                                    {errors.name && <span className="field-error">{errors.name}</span>}
                                </div>

                                <div className="field">
                                    <label>소개 글</label>
                                    <textarea
                                        rows={3}
                                        name="description"
                                        placeholder="매물의 특징과 장점을 간단히 소개하세요"
                                        value={property.description}
                                        onChange={ControlChange}
                                    />
                                </div>

                                <div className="fields-2">
                                    <div className="field">
                                        <label>매물 유형</label>
                                        <select name="type" value={property.type} onChange={ControlChange}>
                                            <option value="ONE_TWO_ROOM">원/투룸</option>
                                            <option value="APARTMENT">아파트</option>
                                            <option value="VILLA">주택/빌라</option>
                                            <option value="OFFICETEL">오피스텔</option>
                                        </select>
                                    </div>
                                    <div className="field">
                                        <label>거래 유형</label>
                                        <select name="dealType" value={property.dealType} onChange={handleDealTypeChange}>
                                            <option value="SALE">매매</option>
                                            <option value="JEONSE">전세</option>
                                            <option value="MONTHLY">월세</option>
                                        </select>
                                    </div>
                                </div>

                                {/* 주소는 검색해서 고르게 한다. 직접 타이핑하면 표기가 제각각이 되어
                                    지역 검색·지도 표시가 어긋난다. */}
                                <AddressInput
                                    label="주소"
                                    value={property.address}
                                    detail={addressDetail}
                                    onChange={({ address, detail, selected }) => {
                                        // 주소를 새로 고르면 구·동도 함께 담는다 (지도에서 동네끼리 묶는 기준)
                                        setProperty((prev) => selected
                                            ? { ...prev, address, sigungu: selected.sigungu, dong: selected.dong }
                                            : { ...prev, address });
                                        setAddressDetail(detail);
                                    }}
                                />

                                <div className="fields-2">
                                    <div className="field">
                                        <label>전용면적(㎡)</label>
                                        <input type="number" name="area" value={property.area} onChange={ControlChange} />
                                    </div>
                                    <div className="field">
                                        <label>층수</label>
                                        <input type="number" name="floor" value={property.floor} onChange={ControlChange} />
                                    </div>
                                </div>

                                <div className="fields-2">
                                    <div className="field">
                                        <label>방 개수</label>
                                        <input type="number" name="roomCount" value={property.roomCount} onChange={ControlChange} />
                                    </div>
                                    <div className="field">
                                        <label>욕실 개수</label>
                                        <input type="number" name="bathroomCount" value={property.bathroomCount} onChange={ControlChange} />
                                    </div>
                                </div>

                                {/* 건축 연도. 맞춤 추천이 신축 여부를 판단하는 데 쓰기 때문에 등록할 때 함께 받는다. */}
                                <div className="fields-2">
                                    <div className="field">
                                        <label>건축 연도</label>
                                        <input
                                            type="number"
                                            name="buildYear"
                                            min={MIN_BUILD_YEAR}
                                            max={MAX_BUILD_YEAR}
                                            placeholder={`예: ${MAX_BUILD_YEAR - 3}`}
                                            value={property.buildYear ?? ""}
                                            onChange={ControlChange}
                                        />
                                        {errors.buildYear && <span className="field-error">{errors.buildYear}</span>}
                                        <div className="xs dim" style={{ marginTop: 6 }}>
                                            맞춤 추천에서 신축 여부를 판단할 때 씁니다. 모르면 비워 두세요.
                                        </div>
                                    </div>
                                </div>
                            </section>
                        )}

                        {step === 1 && (
                            <section className="card">
                                <h2>2. 가격·계약</h2>

                                {property.dealType === "SALE" && (
                                    <div className="fields-2">
                                        <div className="field">
                                            <label>매매가(만 원)</label>
                                            <input
                                                type="number" name="price" value={property.price ?? ""}
                                                onChange={ControlChange}
                                            />
                                            {errors.price && <span className="field-error">{errors.price}</span>}
                                        </div>
                                        <div className="field">
                                            <label>관리비(만 원)</label>
                                            <input type="number" name="maintenanceFee" value={property.maintenanceFee} onChange={ControlChange} />
                                        </div>
                                    </div>
                                )}

                                {property.dealType === "JEONSE" && (
                                    <div className="fields-2">
                                        <div className="field">
                                            <label>전세가(만 원)</label>
                                            <input
                                                type="number" name="deposit" value={property.deposit ?? ""}
                                                onChange={ControlChange}
                                            />
                                            {errors.deposit && <span className="field-error">{errors.deposit}</span>}
                                        </div>
                                        <div className="field">
                                            <label>관리비(만 원)</label>
                                            <input type="number" name="maintenanceFee" value={property.maintenanceFee} onChange={ControlChange} />
                                        </div>
                                    </div>
                                )}

                                {property.dealType === "MONTHLY" && (
                                    <>
                                        <div className="fields-2">
                                            <div className="field">
                                                <label>월세 보증금(만 원)</label>
                                                <input
                                                    type="number" name="monthlyDeposit" value={property.monthlyDeposit ?? ""}
                                                    onChange={ControlChange}
                                                />
                                                {errors.monthlyDeposit && <span className="field-error">{errors.monthlyDeposit}</span>}
                                            </div>
                                            <div className="field">
                                                <label>월세 금액(만 원)</label>
                                                <input
                                                    type="number" name="monthlyRent" value={property.monthlyRent ?? ""}
                                                    onChange={ControlChange}
                                                />
                                                {errors.monthlyRent && <span className="field-error">{errors.monthlyRent}</span>}
                                            </div>
                                        </div>
                                        <div className="fields-2">
                                            <div className="field">
                                                <label>관리비(만 원)</label>
                                                <input type="number" name="maintenanceFee" value={property.maintenanceFee} onChange={ControlChange} />
                                            </div>
                                        </div>
                                    </>
                                )}

                                <div className="fields-2">
                                    <div className="field">
                                        <label>입주 가능일</label>
                                        <input type="date" name="moveInDate" value={property.moveInDate} onChange={ControlChange} />
                                    </div>
                                    <div className="field">
                                        <label>계약 가능 상태</label>
                                        <select name="contractStatus" value={property.contractStatus} onChange={ControlChange}>
                                            <option value="IMMEDIATE">즉시 계약 가능</option>
                                            <option value="NEGOTIABLE">협상 후 결정</option>
                                        </select>
                                    </div>
                                </div>
                            </section>
                        )}

                        {step === 2 && (
                            <section className="card">
                                <h2>3. 사진</h2>
                                <div className="upload-zone" style={{ marginTop: 16 }}>
                                    <strong>매물 사진을 선택해 주세요</strong>
                                    <p className="xs dim" style={{ marginTop: 5 }}>
                                        첫 번째 사진이 대표(메인) 사진이 됩니다. 최대 {MAX_PHOTOS}장
                                    </p>
                                    <input
                                        type="file"
                                        multiple
                                        accept="image/*"
                                        onChange={FileSelect}
                                        style={{ marginTop: 14 }}
                                    />
                                </div>
                                <div className="photo-preview-list">
                                    {/* 수정 화면에서 서버에 이미 저장돼 있는 기존 사진들 */}
                                    {existingImages.map((image) => (
                                        <div key={`existing-${image.id}`} className="photo-preview">
                                            <img src={image.url} alt="기존 매물 사진" />
                                            <button
                                                type="button"
                                                className="ghost-btn"
                                                style={{ minHeight: "auto", padding: "4px 10px", fontSize: 11 }}
                                                onClick={() => removeExistingImage(image.id)}
                                            >
                                                삭제
                                            </button>
                                        </div>
                                    ))}
                                    {/* 이번에 새로 선택한 사진들 */}
                                    {photoPreviews.map((url, i) => (
                                        <div key={`new-${i}`} className="photo-preview">
                                            <img src={url} alt={`매물 사진 ${i + 1}`} />
                                            <button
                                                type="button"
                                                className="ghost-btn"
                                                style={{ minHeight: "auto", padding: "4px 10px", fontSize: 11 }}
                                                onClick={() => removePhoto(i)}
                                            >
                                                삭제
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {step === 3 && (
                            <section className="card">
                                <h2>4. 태그 선택</h2>
                                {(Object.keys(TAG_CATEGORY_LABELS) as TagResponse["category"][]).map((category) => {
                                    const tagsInCategory = availableTags.filter((tag) => tag.category === category);
                                    if (tagsInCategory.length === 0) return null;
                                    return (
                                        <div className="field" key={category}>
                                            <label>{TAG_CATEGORY_LABELS[category]}</label>
                                            <div className="chip-group">
                                                {tagsInCategory.map((tag) => (
                                                    <button
                                                        key={tag.id}
                                                        type="button"
                                                        className={`filter-chip${(property.tagIds ?? []).includes(tag.id) ? " on" : ""}`}
                                                        onClick={() => toggleTag(tag.id)}
                                                    >
                                                        {tag.name}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                                <div className="field">
                                    <label>상세 설명</label>
                                    <textarea
                                        rows={4}
                                        name="detailDescription"
                                        value={property.detailDescription}
                                        onChange={ControlChange}
                                    />
                                </div>
                            </section>
                        )}

                        {step === 4 && (
                            <section className="card ai-band">
                                <h2>5. AI 시세 확인</h2>
                                {aiLoading && <p className="xs dim" style={{ marginTop: 10 }}>불러오는 중…</p>}
                                {!aiEstimate && !aiLoading && (
                                    <p className="dim" style={{ marginTop: 10 }}>
                                        AI 시세 예측은 준비 중입니다. 이 단계는 건너뛰고 등록을 진행하셔도 됩니다.
                                    </p>
                                )}
                                {aiEstimate && (
                                    <div style={{ marginTop: 10 }}>
                                        <strong>AI 예상 시세 {aiEstimate.estimatedPrice.toLocaleString()}만 원</strong>
                                        <p className="dim" style={{ marginTop: 4 }}>
                                            입력 가격 {(toNumber(property.price) ?? 0).toLocaleString()}만 원은 예상 시세보다 약{" "}
                                            {Math.abs(aiEstimate.diffPercent)}%{" "}
                                            {aiEstimate.diffPercent < 0 ? "낮습니다" : "높습니다"}.
                                        </p>
                                    </div>
                                )}
                            </section>
                        )}

                        {step === 5 && (
                            <section className="card">
                                <h2>6. 관리자 승인 요청</h2>
                                <p className="dim" style={{ marginTop: 6 }}>
                                    승인 요청을 보내면 관리자 검토 후 승인되어야 매물 등록이 완료되고
                                    메인·지도에 노출됩니다. 수정도 마찬가지로 다시 승인을 받아야 합니다.
                                </p>
                            </section>
                        )}

                        <div className="row" style={{ justifyContent: "flex-end", gap: 8 }}>
                            <button type="button" className="ghost-btn" onClick={handleDraftSave}>임시 저장</button>
                            <button type="button" className="solid-btn" onClick={handleSubmit}>
                                {isEditMode ? "수정 완료" : "관리자 승인 요청"}
                            </button>
                        </div>
                    </div>
                </div>
            </div></section>
        </main>
    );
}

export default PropertyFormPage;
