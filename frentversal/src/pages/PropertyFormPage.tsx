import { useState, useEffect } from "react";
import axios from "axios";
import { Container, Row, Col, Form, Button, Alert, ListGroup, Card, Spinner } from "react-bootstrap";
import customAxios from "../api/axiosInstance";
import { API_BASE_URL } from "../config/config";
import { useNavigate } from "react-router-dom";
import type { Property } from "../types/Property";
import "../components/PropertyFormPage.css"; // 부트스트랩이 못 커버하는 부분만 남긴 커스텀 css

const STEPS = ["기본 정보", "가격·계약", "사진", "주변 시설·옵션", "AI 시세 확인", "관리자 승인 요청"];
const NUMBER_FIELDS = ["price", "area", "floor", "roomCount", "bathroomCount", "maintenanceFee"];
const OPTION_CHOICES = ["주차 가능", "엘리베이터", "반려동물", "남향", "풀옵션", "즉시 입주"];
const MAINTENANCE_CHOICES = ["수도", "인터넷", "TV", "공용관리비", "엘리베이터", "기타"];

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
            formData.append("file", file);
            try {
                const response = await customAxios.post<{ url: string }>(
                    `${API_BASE_URL}/property/photo`,
                    formData,
                    { headers: { "Content-Type": "multipart/form-data" } }
                );
                setProperty((prev) => ({ ...prev, photos: [...prev.photos, response.data.url] }));
            } catch (error) {
                console.error(error);
                alert("사진 업로드에 실패했습니다.");
            }
        }
    };

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

    const handleDraftSave = async () => {
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
                                    <Form.Select name="propertyType" value={property.propertyType} onChange={ControlChange}>
                                        <option>원/투룸</option>
                                        <option>아파트</option>
                                        <option>주택/빌라</option>
                                        <option>오피스텔</option>
                                    </Form.Select>
                                </Col>
                                <Form.Label column sm={2}>거래 유형</Form.Label>
                                <Col sm={4}>
                                    <Form.Select name="dealType" value={property.dealType} onChange={ControlChange}>
                                        <option>매매</option>
                                        <option>전세</option>
                                        <option>월세</option>
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

                            <Form.Group as={Row} className="mb-3">
                                <Form.Label column sm={2}>가격(만 원)</Form.Label>
                                <Col sm={4}>
                                    <Form.Control type="number" name="price" value={property.price} onChange={ControlChange} />
                                </Col>
                                <Form.Label column sm={2}>관리비(만 원)</Form.Label>
                                <Col sm={4}>
                                    <Form.Control type="number" name="maintenanceFee" value={property.maintenanceFee} onChange={ControlChange} />
                                </Col>
                            </Form.Group>

                            <Form.Group className="mb-3">
                                <Form.Label>관리비 포함 항목</Form.Label>
                                <div>
                                    {MAINTENANCE_CHOICES.map((item) => (
                                        <Form.Check
                                            key={item}
                                            inline
                                            label={item}
                                            type="checkbox"
                                            checked={property.maintenanceIncludes.includes(item)}
                                            onChange={() => toggleArrayValue("maintenanceIncludes", item)}
                                        />
                                    ))}
                                </div>
                            </Form.Group>

                            <Form.Group as={Row} className="mb-3">
                                <Form.Label column sm={2}>입주 가능일</Form.Label>
                                <Col sm={4}>
                                    <Form.Control type="date" name="moveInDate" value={property.moveInDate} onChange={ControlChange} />
                                </Col>
                                <Form.Label column sm={2}>계약 가능 상태</Form.Label>
                                <Col sm={4}>
                                    <Form.Select name="contractStatus" value={property.contractStatus} onChange={ControlChange}>
                                        <option>즉시 계약 가능</option>
                                        <option>협상 후 결정</option>
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
                                {property.photos.map((url, i) => (
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
                            <h2>4. 주변 시설·옵션</h2>
                            <div className="mb-3">
                                {OPTION_CHOICES.map((item) => (
                                    <Button
                                        key={item}
                                        size="sm"
                                        className="me-2 mb-2"
                                        variant={property.options.includes(item) ? "primary" : "outline-secondary"}
                                        onClick={() => toggleArrayValue("options", item)}
                                    >
                                        {item}
                                    </Button>
                                ))}
                            </div>
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
                                        입력 가격 {property.price.toLocaleString()}만 원은 예상 시세보다 약{" "}
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