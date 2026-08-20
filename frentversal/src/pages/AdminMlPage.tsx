// 이 컴포넌트/함수에서 사용할 React 기능과 프로젝트 모듈 불러옴
import { useEffect, useState } from "react";
import { Card, Col, Row, Spinner } from "react-bootstrap";
import customAxios from "../api/axiosInstance.tsx";

// 관리자 ML 상태 API를 조회해 시세모델·추천·군집·텍스트마이닝 상태를 표시하는 React 페이지 컴포넌트임
function AdminMlPage() {
    // 화면에서 값이 바뀔 때 다시 렌더링해야 하는 상태값으로 관리함
    const [data, setData] = useState<any>(null);

    // 화면 진입이나 의존값 변경 시 필요한 부수효과를 실행함
    useEffect(() => {
        // 관리자 ML 상태 API를 조회해 응답 데이터를 화면 상태에 저장함
        customAxios.get("/admin/ml/status")
            .then((res) => setData(res.data))
            .catch((err) => console.error(err));
    }, []);

    if (!data) return <Spinner />;

    const price = data.offline?.price;
    const rec = data.recommendation;
    const clustering = data.offline?.clustering;
    const text = data.offline?.textMining;

    // 계산 또는 렌더링할 최종 결과를 반환함
    return (
        <div>
            <h2>ML 상태</h2>

            <Row className="g-3">
                <Col md={4}>
                    <Card>
                        <Card.Body>
                            <h5>SALE 시세예측</h5>
                            <div>모델: {price?.sale?.selected_model}</div>
                            <div>학습행: {price?.sale?.rows}</div>
                            <div>
                                MAE: {price?.sale?.metrics?.mae?.toFixed?.(1)}
                            </div>
                            <div>
                                R²: {price?.sale?.metrics?.r2?.toFixed?.(3)}
                            </div>
                        </Card.Body>
                    </Card>
                </Col>

                <Col md={4}>
                    <Card>
                        <Card.Body>
                            <h5>JEONSE 시세예측</h5>
                            <div>모델: {price?.jeonse?.selected_model}</div>
                            <div>학습행: {price?.jeonse?.rows}</div>
                            <div>
                                MAE: {price?.jeonse?.metrics?.mae?.toFixed?.(1)}
                            </div>
                            <div>
                                R²: {price?.jeonse?.metrics?.r2?.toFixed?.(3)}
                            </div>
                        </Card.Body>
                    </Card>
                </Col>

                <Col md={4}>
                    <Card>
                        <Card.Body>
                            <h5>MONTHLY 시세예측</h5>
                            <div>모델: {price?.monthly?.selected_model}</div>
                            <div>
                                보증금 MAE:{" "}
                                {price?.monthly?.metrics?.deposit?.mae?.toFixed?.(1)}
                            </div>
                            <div>
                                월세 MAE:{" "}
                                {price?.monthly?.metrics?.rent?.mae?.toFixed?.(1)}
                            </div>
                        </Card.Body>
                    </Card>
                </Col>

                <Col md={4}>
                    <Card>
                        <Card.Body>
                            <h5>맞춤 추천</h5>

                            <div>
                                평가 수:{" "}
                                {(rec?.likeCount ?? 0) + (rec?.dislikeCount ?? 0)}
                            </div>

                            <div>
                                👍 {rec?.likeCount ?? 0} / 👎 {rec?.dislikeCount ?? 0}
                            </div>

                            <div>
                                추천 적합률:{" "}
                                {rec?.fitRate === ""
                                    ? "-"
                                    : `${Number(rec?.fitRate ?? 0).toFixed(1)}%`}
                            </div>
                        </Card.Body>
                    </Card>
                </Col>

                <Col md={4}>
                    <Card>
                        <Card.Body>
                            <h5>동네 K-Means</h5>
                            <div>
                                행정동 수: {clustering?.neighborhoodCount}
                            </div>
                            <div>
                                선택 K: {clustering?.selectedK}
                            </div>
                            <div>
                                분석일: {clustering?.analyzedAt}
                            </div>
                        </Card.Body>
                    </Card>
                </Col>

                <Col md={4}>
                    <Card>
                        <Card.Body>
                            <h5>동네 텍스트마이닝</h5>
                            <div>
                                문서 수: {text?.documentCount}
                            </div>
                            <div>
                                분석 동네: {text?.neighborhoodCount}
                            </div>
                            <div>
                                분석일: {text?.analyzedAt}
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </div>
    );
}

export default AdminMlPage;