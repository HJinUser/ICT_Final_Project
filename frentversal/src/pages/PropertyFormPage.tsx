import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { Container, Row, Col, Form, Button, Alert, ListGroup, Card, Spinner } from "react-bootstrap";
import customAxios from "../api/axiosInstance";
import { API_BASE_URL } from "../config/config";
import { useNavigate } from "react-router-dom";
import type { Property } from "../types/Property";
import type { TagResponse } from "../types/Tag";
import "../components/PropertyFormPage.css"; // 부트스트랩이 못 커버하는 부분만 남긴 커스텀 css

const STEPS = ["기본 정보", "가격·계약", "사진", "태그 선택", "AI 시세 확인", "관리자 승인 요청"];
const NUMBER_FIELDS = ["price", "deposit", "monthlyDeposit", "monthlyRent", "area", "floor", "roomCount", "bathroomCount", "maintenanceFee"];
const MAX_PHOTOS = 3; // 백엔드 PropertyImageService.MAX_IMAGE_COUNT 와 동일하게 맞춤

// 태그 category(영문 코드) -> 화면에 보여줄 한글 라벨
const TAG_CATEGORY_LABELS: Record<TagResponse["category"], string> = {
    ATMOSPHERE: "분위기",
    LIVING_ENVIRONMENT: "생활환경",
    TRANSPORTATION: "교통편의",
    NATURAL_ENVIRONMENT: "자연환경",
};

const initial_value: Property = {
    agency: { id: 1 }, // TODO: 로그인 연동 전이라 임시로 data.sql의 1번 중개사무소로 고정. 회원 도메인 완성되면 로그인한 중개인의 agency id로 교체
    name: "", description: "", type: "ONE_TWO_ROOM", dealType: "JEONSE",
    address: "", area: 0, floor: 0, roomCount: 0, bathroomCount: 0,
    price: 0, maintenanceFee: 0,
    moveInDate: "", contractStatus: "IMMEDIATE",
    detailDescription: "", tagIds: [],
};

function PropertyFormPage() {
    const navigate = useNavigate();
    const [step, setStep] = useState(0);

    // property는 등록하고자 하는 매물의 정보 (ProductInsertForm의 product와 같은 역할)
    const [property, setProperty] = useState<Property>(initial_value);

    // 필드별 오류 메시지 (백엔드 응답의 필드별 오류를 그대로 매칭)
    const [errors, setErrors] = useState<Record<string, string>>({});

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

    // 태그 목록. 서버가 갖고 있는 전체 태그를 받아와서 선택 UI를 그린다
    const [availableTags, setAvailableTags] = useState<TagResponse[]>([]);
    useEffect(() => {
        const fetchTags = async () => {
            try {
                const response = await customAxios.get<TagResponse[]>(`${API_BASE_URL}/tag`);
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
                    timeout: 15000,
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

    // input, textarea, select 공통 변경 핸들러 (숫자 필드는 Number로 변환)
    const ControlChange = (
        event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => {
        const { name, value } = event.target;
        const isNumber = NUMBER_FIELDS.includes(name);
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

    // 사진 선택. 실제 업로드는 안 하고 파일만 들고 있다가 최종 제출(handleSubmit)에서 한 번에 보낸다
    const FileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const { files } = event.target;
        if (!files || files.length === 0) {
            alert("사진을 선택해 주셔야 합니다.");
            return;
        }
        const selected = Array.from(files);
        if (photoFiles.length + selected.length > MAX_PHOTOS) {
            alert(`사진은 최대 ${MAX_PHOTOS}장까지 등록할 수 있습니다.`);
            return;
        }
        setPhotoFiles((prev) => [...prev, ...selected]);
        event.target.value = ""; // 같은 파일을 다시 선택할 수 있도록 입력값 초기화
    };

    const removePhoto = (index: number) => {
        setPhotoFiles((prev) => prev.filter((_, i) => i !== index));
    };

    // 관리자 승인 요청. 백엔드가 멀티파트(consumes = MULTIPART_FORM_DATA_VALUE)로 받으므로
    // "data" 파트엔 JSON, "files" 파트엔 실제 사진 파일들을 담아 FormData로 함께 보낸다.
    // Content-Type 헤더는 직접 지정하지 않는다 — axios가 FormData를 보고 boundary까지 포함해 자동으로 설정해준다.
    const handleSubmit = async () => {
        try {
            const formData = new FormData();
            formData.append("data", new Blob([JSON.stringify(property)], { type: "application/json" }));
            photoFiles.forEach((file) => formData.append("files", file));

            const response = await customAxios.post(`${API_BASE_URL}/property/insert`, formData);
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

    const handleDraftSave = async () => {
        // TODO: /property/draft 임시저장 엔드포인트는 아직 백엔드에 없음. 나중에 필요해지면 추가.
        await customAxios.post(`${API_BASE_URL}/property/draft`, property);
        alert("임시 저장했습니다.");
    };

    return (
        <Container style={{ marginTop: "30px", marginBottom: "50px" }}>
            <h1>매물 등록 / 수정</h1>

            {errors.general && <Alert variant="danger">{errors.general}</Alert>}

            <Row>
                {/* 좌측 사이드바: 단계 이동 */}
                <Col md={3} className="mb-3">
                    <ListGroup>
                        {STEPS.map((label, i) => (
                            <ListGroup.Item key={i} action active={i === step} onClick={() => setStep(i)}>
                                {i + 1}. {label}
                            </ListGroup.Item>
                        ))}
                    </ListGroup>
                </Col>

                {/* 우측 폼 영역 */}
                <Col md={9}>
                    {step === 0 && (
                        <Card className="p-3 mb-3">
                            <h2>1. 기본 정보</h2>

                            <Form.Group as={Row} className="mb-3" controlId="formName">
                                <Form.Label column sm={2}>매물명</Form.Label>
                                <Col sm={10}>
                                    <Form.Control
                                        name="name"
                                        placeholder="매물을 특정할 수 있는 이름"
                                        value={property.name}
                                        onChange={ControlChange}
                                        isInvalid={!!errors.name}
                                    />
                                    <Form.Control.Feedback type="invalid">{errors.name}</Form.Control.Feedback>
                                </Col>
                            </Form.Group>

                            <Form.Group as={Row} className="mb-3" controlId="formDescription">
                                <Form.Label column sm={2}>소개 글</Form.Label>
                                <Col sm={10}>
                                    <Form.Control
                                        as="textarea"
                                        rows={3}
                                        name="description"
                                        placeholder="매물의 특징과 장점을 간단히 소개하세요"
                                        value={property.description}
                                        onChange={ControlChange}
                                    />
                                </Col>
                            </Form.Group>

                            <Form.Group as={Row} className="mb-3">
                                <Form.Label column sm={2}>매물 유형</Form.Label>
                                <Col sm={4}>
                                    <Form.Select name="type" value={property.type} onChange={ControlChange}>
                                        <option value="ONE_TWO_ROOM">원/투룸</option>
                                        <option value="APARTMENT">아파트</option>
                                        <option value="VILLA">주택/빌라</option>
                                        <option value="OFFICETEL">오피스텔</option>
                                    </Form.Select>
                                </Col>
                                <Form.Label column sm={2}>거래 유형</Form.Label>
                                <Col sm={4}>
                                    <Form.Select name="dealType" value={property.dealType} onChange={handleDealTypeChange}>
                                        <option value="SALE">매매</option>
                                        <option value="JEONSE">전세</option>
                                        <option value="MONTHLY">월세</option>
                                    </Form.Select>
                                </Col>
                            </Form.Group>

                            <Form.Group as={Row} className="mb-3" controlId="formAddress">
                                <Form.Label column sm={2}>주소</Form.Label>
                                <Col sm={10}>
                                    <Form.Control
                                        name="address"
                                        placeholder="도로명 주소 검색"
                                        value={property.address}
                                        onChange={ControlChange}
                                    />
                                </Col>
                            </Form.Group>

                            <Form.Group as={Row} className="mb-3">
                                <Form.Label column sm={2}>전용면적(㎡)</Form.Label>
                                <Col sm={4}>
                                    <Form.Control type="number" name="area" value={property.area} onChange={ControlChange} />
                                </Col>
                                <Form.Label column sm={2}>층수</Form.Label>
                                <Col sm={4}>
                                    <Form.Control type="number" name="floor" value={property.floor} onChange={ControlChange} />
                                </Col>
                            </Form.Group>

                            <Form.Group as={Row} className="mb-3">
                                <Form.Label column sm={2}>방 개수</Form.Label>
                                <Col sm={4}>
                                    <Form.Control type="number" name="roomCount" value={property.roomCount} onChange={ControlChange} />
                                </Col>
                                <Form.Label column sm={2}>욕실 개수</Form.Label>
                                <Col sm={4}>
                                    <Form.Control type="number" name="bathroomCount" value={property.bathroomCount} onChange={ControlChange} />
                                </Col>
                            </Form.Group>
                        </Card>
                    )}

                    {step === 1 && (
                    <Card className="p-3 mb-3">
                        <h2>2. 가격·계약</h2>

                        {property.dealType === "SALE" && (
                            <Form.Group as={Row} className="mb-3">
                                <Form.Label column sm={2}>매매가(만 원)</Form.Label>
                                <Col sm={4}>
                                    <Form.Control
                                        type="number" name="price" value={property.price ?? 0}
                                        onChange={ControlChange} isInvalid={!!errors.price}
                                    />
                                    <Form.Control.Feedback type="invalid">{errors.price}</Form.Control.Feedback>
                                </Col>
                                <Form.Label column sm={2}>관리비(만 원)</Form.Label>
                                <Col sm={4}>
                                    <Form.Control type="number" name="maintenanceFee" value={property.maintenanceFee} onChange={ControlChange} />
                                </Col>
                            </Form.Group>
                        )}

                        {property.dealType === "JEONSE" && (
                            <Form.Group as={Row} className="mb-3">
                                <Form.Label column sm={2}>전세가(만 원)</Form.Label>
                                <Col sm={4}>
                                    <Form.Control
                                        type="number" name="deposit" value={property.deposit ?? 0}
                                        onChange={ControlChange} isInvalid={!!errors.deposit}
                                    />
                                    <Form.Control.Feedback type="invalid">{errors.deposit}</Form.Control.Feedback>
                                </Col>
                                <Form.Label column sm={2}>관리비(만 원)</Form.Label>
                                <Col sm={4}>
                                    <Form.Control type="number" name="maintenanceFee" value={property.maintenanceFee} onChange={ControlChange} />
                                </Col>
                            </Form.Group>
                        )}

                        {property.dealType === "MONTHLY" && (
                            <>
                                <Form.Group as={Row} className="mb-3">
                                    <Form.Label column sm={2}>월세 보증금(만 원)</Form.Label>
                                    <Col sm={4}>
                                        <Form.Control
                                            type="number" name="monthlyDeposit" value={property.monthlyDeposit ?? 0}
                                            onChange={ControlChange} isInvalid={!!errors.monthlyDeposit}
                                        />
                                        <Form.Control.Feedback type="invalid">{errors.monthlyDeposit}</Form.Control.Feedback>
                                    </Col>
                                    <Form.Label column sm={2}>월세 금액(만 원)</Form.Label>
                                    <Col sm={4}>
                                        <Form.Control
                                            type="number" name="monthlyRent" value={property.monthlyRent ?? 0}
                                            onChange={ControlChange} isInvalid={!!errors.monthlyRent}
                                        />
                                        <Form.Control.Feedback type="invalid">{errors.monthlyRent}</Form.Control.Feedback>
                                    </Col>
                                </Form.Group>
                                <Form.Group as={Row} className="mb-3">
                                    <Form.Label column sm={2}>관리비(만 원)</Form.Label>
                                    <Col sm={4}>
                                        <Form.Control type="number" name="maintenanceFee" value={property.maintenanceFee} onChange={ControlChange} />
                                    </Col>
                                </Form.Group>
                            </>
                        )}

                        <Form.Group as={Row} className="mb-3">
                            <Form.Label column sm={2}>입주 가능일</Form.Label>
                            <Col sm={4}>
                                <Form.Control type="date" name="moveInDate" value={property.moveInDate} onChange={ControlChange} />
                            </Col>
                            <Form.Label column sm={2}>계약 가능 상태</Form.Label>
                            <Col sm={4}>
                                <Form.Select name="contractStatus" value={property.contractStatus} onChange={ControlChange}>
                                    <option value="IMMEDIATE">즉시 계약 가능</option>
                                    <option value="NEGOTIABLE">협상 후 결정</option>
                                </Form.Select>
                            </Col>
                        </Form.Group>
                    </Card>
                )}

                    {step === 2 && (
                        <Card className="p-3 mb-3">
                            <h2>3. 사진</h2>
                            <Form.Group controlId="formPhotos" className="mb-3">
                                <Form.Control type="file" multiple accept="image/*" onChange={FileSelect} />
                            </Form.Group>
                            <div className="photo-preview-list">
                                {photoPreviews.map((url, i) => (
                                    <div key={i} className="photo-preview">
                                        <img src={url} alt={`매물 사진 ${i + 1}`} />
                                        <Button size="sm" variant="dark" onClick={() => removePhoto(i)}>삭제</Button>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    )}

                    {step === 3 && (
                        <Card className="p-3 mb-3">
                            <h2>4. 태그 선택</h2>
                            {(Object.keys(TAG_CATEGORY_LABELS) as TagResponse["category"][]).map((category) => {
                                const tagsInCategory = availableTags.filter((tag) => tag.category === category);
                                if (tagsInCategory.length === 0) return null;
                                return (
                                    <div key={category} className="mb-3">
                                        <Form.Label className="d-block">{TAG_CATEGORY_LABELS[category]}</Form.Label>
                                        {tagsInCategory.map((tag) => (
                                            <Button
                                                key={tag.id}
                                                size="sm"
                                                className="me-2 mb-2"
                                                variant={(property.tagIds ?? []).includes(tag.id) ? "primary" : "outline-secondary"}
                                                onClick={() => toggleTag(tag.id)}
                                            >
                                                {tag.name}
                                            </Button>
                                        ))}
                                    </div>
                                );
                            })}
                            <Form.Group controlId="formDetail">
                                <Form.Label>상세 설명</Form.Label>
                                <Form.Control
                                    as="textarea"
                                    rows={4}
                                    name="detailDescription"
                                    value={property.detailDescription}
                                    onChange={ControlChange}
                                />
                            </Form.Group>
                        </Card>
                    )}

                    {step === 4 && (
                        <Card className="p-3 mb-3 ai-band">
                            <h2>5. AI 시세 확인</h2>
                            {aiLoading && <Spinner animation="border" size="sm" />}
                            {aiEstimate && (
                                <div>
                                    <strong>AI 예상 시세 {aiEstimate.estimatedPrice.toLocaleString()}만 원</strong>
                                    <p className="text-muted mb-0">
                                        입력 가격 {(property.price ?? 0).toLocaleString()}만 원은 예상 시세보다 약{" "}
                                        {Math.abs(aiEstimate.diffPercent)}%{" "}
                                        {aiEstimate.diffPercent < 0 ? "낮습니다" : "높습니다"}.
                                    </p>
                                </div>
                            )}
                        </Card>
                    )}

                    {step === 5 && (
                        <Card className="p-3 mb-3">
                            <h2>6. 관리자 승인 요청</h2>
                            <p className="text-muted mb-0">
                                승인 요청을 보내면 관리자 검토 후 승인되어야 매물 등록이 완료되고
                                메인·지도에 노출됩니다.
                            </p>
                        </Card>
                    )}

                    <div className="d-flex justify-content-end gap-2">
                        <Button variant="outline-secondary" onClick={handleDraftSave}>임시 저장</Button>
                        <Button variant="primary" onClick={handleSubmit}>관리자 승인 요청</Button>
                    </div>
                </Col>
            </Row>
        </Container>
    );
}

export default PropertyFormPage;