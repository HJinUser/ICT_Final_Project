import { useState, useEffect, useMemo, useCallback } from "react";
import axios from "axios";
// customAxios 는 baseURL 이 이미 "/api" 라서, 요청 주소는 "/property/insert" 처럼 그 뒤만 적는다.
// 여기에 API_BASE_URL 을 또 붙이면 "/api/api/property/insert" 가 되어 서버가 못 알아듣는다.
import customAxios from "../api/axiosInstance";
import AddressInput from "./components/AddressInput";
import { useNavigate, useParams } from "react-router-dom";
import type {
    Property,
    PropertyResponse,
    PropertyImageResponse,
    PropertyDraftSummary,
} from "../types/Property";
import type { TagResponse } from "../types/Tag";
import "../styles/PropertyFormPage.css"; // 부트스트랩이 못 커버하는 부분만 남긴 커스텀 css

const STEPS = ["기본 정보", "가격·계약", "사진", "태그 선택", "AI 시세 확인", "관리자 승인 요청"];

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
    buildYear: undefined,
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

// 서버의 저장 시각을 화면에 YYYY-MM-DD HH:mm 형식으로 표시하는 함수임
const formatDraftDateTime = (value: string) => {
    const date = new Date(value);

    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    const hh = String(date.getHours()).padStart(2, "0");
    const min = String(date.getMinutes()).padStart(2, "0");

    return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
};

// AI 예측에 사용한 입력값 묶음을 문자열 Key로 만들어 변경 여부 비교에 사용함
// 현재 화면은 상세주소를 별도 state로 들고 있으므로 실제 서버에 보낼 주소와 같은 형태로 합쳐 비교함
const makePredictionInputKey = (value: PropertyFormState, detail = "") => JSON.stringify([
    value.type,
    value.dealType,
    [value.address, detail].filter(Boolean).join(" ").trim(),
    value.area,
    value.floor,
    value.buildYear,
]);

function PropertyFormPage() {
    const navigate = useNavigate();
    // 주소에 :id가 있으면 수정 화면, 없으면 등록 화면이다 (라우트: /property/form, /property/form/:id)
    const { id } = useParams<{ id: string }>();
    const isEditMode = Boolean(id);

    const [step, setStep] = useState(0);

    // 화면에서 값이 바뀔 때 다시 렌더링해야 하는 DRAFT 관련 상태값으로 관리함
    const [draftId, setDraftId] = useState<number | null>(null);
    const [drafts, setDrafts] = useState<PropertyDraftSummary[]>([]);
    const [draftSaving, setDraftSaving] = useState(false);
    const [stepError, setStepError] = useState<string | null>(null);

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

    // 5단계 AI 시세예측 결과의 DRAFT ID·예측가격·역거리·모델버전을 보관하는 TypeScript 타입임
    interface AiEstimate {
        draftId: number;
        aiPrice: number | null;
        aiDeposit: number | null;
        aiMonthlyDeposit: number | null;
        aiMonthlyRent: number | null;
        stationDistance: number | null;
        modelVersion: string;
    }

    const [aiEstimate, setAiEstimate] = useState<AiEstimate | null>(null);
    const [aiLoading, setAiLoading] = useState(false);
    const [aiError, setAiError] = useState<string | null>(null);

    // 로그인한 중개인의 임시저장 목록을 서버에서 조회하는 함수임
    const loadDrafts = useCallback(async () => {
        if (isEditMode) return;

        try {
            const response = await customAxios.get<PropertyDraftSummary[]>(
                "/property/drafts"
            );
            setDrafts(response.data);
        } catch (error) {
            console.error("임시저장 목록 조회 실패:", error);
            setDrafts([]);
        }
    }, [isEditMode]);

    useEffect(() => {
        void loadDrafts();
    }, [loadDrafts]);

    // 의존값이 바뀔 때만 계산해서 불필요한 재계산을 줄임
    const predictionInputKey = useMemo(
        () => makePredictionInputKey(property, addressDetail),
        [
            property.type,
            property.dealType,
            property.address,
            property.area,
            property.floor,
            property.buildYear,
            addressDetail,
        ]
    );

    const [predictedInputKey, setPredictedInputKey] = useState<string | null>(null);

    // 현재 Wizard 단계의 필수 입력이 충족됐는지 단계별로 확인하는 함수임
    const isStepComplete = (targetStep: number, value: PropertyFormState) => {
        switch (targetStep) {
            case 0:
                return Boolean(value.name?.trim())
                    && Boolean(value.address?.trim())
                    && Number(value.area) > 0
                    && Number.isFinite(Number(value.floor))
                    && Number(value.buildYear) > 0
                    && Number(value.roomCount) >= 1
                    && Number(value.bathroomCount) >= 1;

            case 1:
                if (value.dealType === "SALE") {
                    return Number(value.price) > 0;
                }

                if (value.dealType === "JEONSE") {
                    return Number(value.deposit) > 0;
                }

                return Number(value.monthlyDeposit) > 0
                    && Number(value.monthlyRent) > 0;

            // 현재 코드 기준 사진/태그/상세설명은 필수 제약이 없으므로 통과.
            case 2:
            case 3:
                return true;

            case 4:
                return aiEstimate !== null
                    && predictedInputKey === predictionInputKey;

            default:
                return true;
        }
    };

    // 기존 DRAFT를 불러왔을 때 처음으로 미완성인 단계 위치를 찾는 함수임
    const findFirstIncompleteStep = (value: PropertyFormState) => {
        for (let i = 0; i <= 3; i += 1) {
            if (!isStepComplete(i, value)) {
                return i;
            }
        }

        return 4;
    };

    // 현재 단계 검증을 통과했을 때만 다음 Wizard 단계로 이동하는 함수임
    const handleNext = () => {
        setStepError(null);

        if (!isStepComplete(step, property)) {
            setStepError("현재 단계의 필수 항목을 모두 입력해 주세요.");
            return;
        }

        setStep((prev) => Math.min(prev + 1, STEPS.length - 1));
    };

    // 현재 Wizard에서 이전 단계로 이동하는 함수임
    const handlePrev = () => {
        setStepError(null);
        setStep((prev) => Math.max(prev - 1, 0));
    };

    // AI 입력을 바꾸면 화면에 보관 중인 이전 예측 결과를 즉시 무효화함
    useEffect(() => {
        if (predictedInputKey !== null
                && predictedInputKey !== predictionInputKey) {
            setAiEstimate(null);
            setAiError(null);
            setPredictedInputKey(null);
        }
    }, [predictionInputKey, predictedInputKey]);

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

    // 현재 폼 상태를 Spring Property 요청 형태로 변환함
    // 상세주소는 현재 화면 구조에 맞게 도로명 주소 뒤에 합치고 숫자 입력도 실제 number로 바꿈
    const buildPayload = (includeKeepImageIds: boolean): Property => {
        const address = [property.address, addressDetail].filter(Boolean).join(" ");

        return {
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
            ...(includeKeepImageIds
                ? { keepImageIds: existingImages.map((image) => image.id) }
                : {}),
        };
    };

    // 현재 폼과 파일을 multipart FormData로 묶어 DRAFT API에 저장하는 함수임
    const saveDraft = async (showMessage: boolean) => {
        const payload = buildPayload(true);

        const formData = new FormData();
        formData.append(
            "data",
            new Blob([JSON.stringify(payload)], { type: "application/json" })
        );
        photoFiles.forEach((file) => formData.append("files", file));

        const response = await customAxios.post<PropertyResponse>(
            "/property/draft",
            formData,
            {
                params: {
                    draftId: draftId ?? undefined,
                },
            }
        );

        setDraftId(response.data.id);
        setProperty(mapResponseToProperty(response.data));
        // 서버에는 상세주소가 합쳐진 한 문자열로 저장되므로 다시 저장할 때 중복으로 붙지 않게 비움
        setAddressDetail("");
        setExistingImages(response.data.images);
        setPhotoFiles([]);

        if (showMessage) {
            alert("임시 저장했습니다.");
        }

        await loadDrafts();
        return response.data;
    };

    // 사용자가 임시저장 버튼을 눌렀을 때 저장 요청과 안내를 처리하는 함수임
    const handleDraftSave = async () => {
        if (isEditMode) {
            return;
        }

        try {
            setDraftSaving(true);
            await saveDraft(true);
        } catch (error) {
            console.error(error);
            alert("임시 저장에 실패했습니다.");
        } finally {
            setDraftSaving(false);
        }
    };

    // 선택한 임시저장 매물을 불러와 폼을 복원하고 이어 작성 위치로 이동하는 함수임
    const handleContinueDraft = async (targetDraftId: number) => {
        try {
            const response = await customAxios.get<PropertyResponse>(
                `/property/draft/${targetDraftId}`
            );

            const restored = mapResponseToProperty(response.data);

            setDraftId(response.data.id);
            setProperty(restored);
            setAddressDetail("");
            setExistingImages(response.data.images);
            setPhotoFiles([]);

            const restoredAi: AiEstimate | null = (() => {
                const hasAi = response.data.aiPrice !== null
                    || response.data.aiDeposit !== null
                    || response.data.aiMonthlyDeposit !== null
                    || response.data.aiMonthlyRent !== null;

                if (!hasAi) return null;

                return {
                    draftId: response.data.id,
                    aiPrice: response.data.aiPrice,
                    aiDeposit: response.data.aiDeposit,
                    aiMonthlyDeposit: response.data.aiMonthlyDeposit,
                    aiMonthlyRent: response.data.aiMonthlyRent,
                    stationDistance: response.data.stationDistance,
                    modelVersion: "saved",
                };
            })();

            setAiEstimate(restoredAi);
            setAiError(null);

            if (restoredAi) {
                setPredictedInputKey(makePredictionInputKey(restored));
                setStep(5);
            } else {
                setPredictedInputKey(null);
                setStep(findFirstIncompleteStep(restored));
            }
        } catch (error) {
            console.error(error);
            alert("임시 저장된 매물을 불러오지 못했습니다.");
            await loadDrafts();
        }
    };

    // 현재 입력을 먼저 DRAFT로 저장한 뒤 AI 시세예측 API를 호출하는 함수임
    const handleAiPredict = async () => {
        try {
            if (isEditMode) {
                setAiLoading(true);
                setAiError(null);

                const response = await customAxios.post<AiEstimate>(
                    `/property/${id}/edit-ai-price`,
                    buildPayload(false),
                    {
                        params: {
                            draftId: draftId ?? undefined,
                        },
                    }
                );

                setDraftId(response.data.draftId);
                setAiEstimate(response.data);
                setPredictedInputKey(predictionInputKey);
                return;
            }

            setAiLoading(true);
            setAiError(null);

            // 현재 화면을 먼저 같은 DRAFT에 저장함
            const savedDraft = await saveDraft(false);

            const response = await customAxios.post<AiEstimate>(
                `/property/draft/${savedDraft.id}/ai-price`
            );

            setAiEstimate(response.data);
            // saveDraft 응답의 주소/숫자값 기준으로 AI 입력 Key를 맞춰 둠
            setPredictedInputKey(
                makePredictionInputKey(mapResponseToProperty(savedDraft))
            );
            await loadDrafts();
        } catch (error: unknown) {
            if (axios.isAxiosError(error)) {
                setAiError(
                    error.response?.data?.message
                    ?? "AI 시세 예측에 실패했습니다."
                );
            } else {
                setAiError("AI 시세 예측에 실패했습니다.");
            }
        } finally {
            setAiLoading(false);
        }
    };

    // 최종 입력을 저장하고 DRAFT를 관리자 승인대기 PENDING으로 제출하는 함수임
    const handleSubmit = async () => {
        try {
            if (isEditMode) {
                if (!draftId || !aiEstimate
                        || predictedInputKey !== predictionInputKey) {
                    setStep(4);
                    setAiError("수정 완료 전에 현재 입력 정보로 AI 시세 예측을 실행해 주세요.");
                    return;
                }

                const payload = buildPayload(true);

                const formData = new FormData();
                formData.append(
                    "data",
                    new Blob([JSON.stringify(payload)], { type: "application/json" })
                );
                photoFiles.forEach((file) => formData.append("files", file));

                await customAxios.put(`/property/${id}`, formData, {
                    params: { draftId },
                });

                alert("매물 정보를 수정했습니다. 관리자 재승인을 기다려 주세요.");
                navigate(`/property/${id}`);
                return;
            }

            // 전체 1~4단계 검증
            for (let i = 0; i <= 3; i += 1) {
                if (!isStepComplete(i, property)) {
                    setStep(i);
                    setStepError("필수 항목을 모두 입력해 주세요.");
                    return;
                }
            }

            if (!aiEstimate || predictedInputKey !== predictionInputKey) {
                setStep(4);
                setAiError("관리자 승인 요청 전에 현재 입력 정보로 AI 시세 예측을 실행해 주세요.");
                return;
            }

            // 5단계 이후 바뀐 일반 필드까지 서버 DRAFT에 마지막으로 저장함
            const savedDraft = await saveDraft(false);

            // AI 입력이 달라져 서버가 AI 값을 무효화했다면 제출 금지
            const hasSavedAi = property.dealType === "SALE"
                ? savedDraft.aiPrice !== null
                : property.dealType === "JEONSE"
                    ? savedDraft.aiDeposit !== null
                    : savedDraft.aiMonthlyDeposit !== null
                        && savedDraft.aiMonthlyRent !== null;

            if (!hasSavedAi) {
                setAiEstimate(null);
                setPredictedInputKey(null);
                setStep(4);
                setAiError("AI 시세 예측에 사용한 입력값이 변경되었습니다. 다시 예측해 주세요.");
                return;
            }

            await customAxios.post("/property/insert", null, {
                params: { draftId: savedDraft.id },
            });

            alert("관리자 승인 요청을 보냈습니다.");
            navigate("/broker/agency");
        } catch (error: unknown) {
            if (axios.isAxiosError(error)) {
                setErrors({
                    general: error.response?.data?.message
                        ?? "관리자 승인 요청 중 오류가 발생했습니다.",
                });
            } else {
                setErrors({
                    general: "서버와의 통신 중 오류가 발생했습니다.",
                });
            }
        }
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
                        {/* 신규 등록 모드에서만 왼쪽 위에 임시저장 DRAFT 목록을 표시함 */}
                        {!isEditMode && (
                            <div className="draft-list-box mb-3">
                                <div className="fw-bold mb-2">임시 저장된 매물</div>

                                {drafts.length === 0 ? (
                                    <div className="text-muted small">
                                        임시 저장된 매물이 없습니다.
                                    </div>
                                ) : (
                                    drafts.map((draft) => (
                                        <div key={draft.id} className="draft-list-row">
                                            <div className="draft-list-text text-truncate">
                                                <span className="fw-semibold">
                                                    {draft.name?.trim() || "제목 없는 임시저장"}
                                                </span>
                                                <span className="text-muted">
                                                    {" · "}{formatDraftDateTime(draft.updatedAt)}
                                                </span>
                                            </div>

                                            <button
                                                type="button"
                                                className="ghost-btn"
                                                style={{ minHeight: "auto", padding: "4px 10px", fontSize: 11 }}
                                                onClick={() => handleContinueDraft(draft.id)}
                                            >
                                                이어 작성
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        <div className="side-title">등록 순서</div>
                        <div className="side-nav">
                            {STEPS.map((label, i) => (
                                <button
                                    key={i}
                                    type="button"
                                    className={i === step ? "on" : ""}
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
                                        <div className="buildyear-hint">
                                            매물의 실제 건축연도를 입력해 주세요. 임시 저장 시에는 비워둘 수 있지만, 최종 승인 요청 전에는 반드시 입력해야 합니다.
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

                                {aiError && <div className="form-alert" style={{ marginTop: 10 }}>{aiError}</div>}

                                <button
                                    type="button"
                                    className="solid-btn"
                                    onClick={handleAiPredict}
                                    disabled={aiLoading}
                                    style={{ marginTop: 12 }}
                                >
                                    {aiLoading ? "AI 시세 예측 중..." : "AI 시세 예측"}
                                </button>

                                {aiEstimate && (
                                    <div style={{ marginTop: 14 }}>
                                        {property.dealType === "SALE" && (
                                            <strong>
                                                AI 예상 매매가 {aiEstimate.aiPrice?.toLocaleString()}만 원
                                            </strong>
                                        )}

                                        {property.dealType === "JEONSE" && (
                                            <strong>
                                                AI 예상 전세가 {aiEstimate.aiDeposit?.toLocaleString()}만 원
                                            </strong>
                                        )}

                                        {property.dealType === "MONTHLY" && (
                                            <strong>
                                                AI 예상 월세 보증금 {aiEstimate.aiMonthlyDeposit?.toLocaleString()}만 원
                                                {" / "}
                                                월세 {aiEstimate.aiMonthlyRent?.toLocaleString()}만 원
                                            </strong>
                                        )}
                                    </div>
                                )}
                            </section>
                        )}

                        {step === 5 && (
                            <section className="card">
                                <h2>6. 관리자 승인 요청</h2>
                                <p className="dim" style={{ marginTop: 6 }}>
                                    승인 요청을 보내면 관리자 검토 후 승인되어야 매물 등록이 완료되고 메인, 지도에 노출됩니다. <br />
                                    수정도 마찬가지로 다시 승인을 받아야 합니다.
                                </p>
                            </section>
                        )}

                        {stepError && (
                            <div className="form-alert" style={{ marginTop: 12 }}>
                                {stepError}
                            </div>
                        )}

                        <div
                            className="row"
                            style={{ justifyContent: "space-between", alignItems: "center", gap: 8, marginTop: 12 }}
                        >
                            <div>
                                {!isEditMode && (
                                    <button
                                        type="button"
                                        className="ghost-btn"
                                        onClick={handleDraftSave}
                                        disabled={draftSaving}
                                    >
                                        {draftSaving ? "저장 중..." : "임시 저장"}
                                    </button>
                                )}
                            </div>

                            <div className="row" style={{ gap: 8 }}>
                                {step > 0 && (
                                    <button type="button" className="ghost-btn" onClick={handlePrev}>
                                        이전
                                    </button>
                                )}

                                {step < 5 && (
                                    <button type="button" className="solid-btn" onClick={handleNext}>
                                        다음
                                    </button>
                                )}

                                {step === 5 && (
                                    <button type="button" className="solid-btn" onClick={handleSubmit}>
                                        관리자 승인 요청
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div></section>
        </main>
    );
}

export default PropertyFormPage;
