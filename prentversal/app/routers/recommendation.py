# 이 파일에서 사용할 표준/외부 모듈과 프로젝트 내부 기능 불러옴
from fastapi import APIRouter, HTTPException

from app.schemas.recommendation import RecommendationRequest, RecommendationResponse
from app.services.recommendation_service import recommend

# 이 기능의 공통 URL prefix와 문서 태그를 FastAPI Router에 설정함.
router = APIRouter(prefix="/ml/recommendation", tags=["ML Recommendation"])


# 추천 요청을 서비스로 넘기고 FastAPI 응답으로 반환하는 엔드포인트 함수임
@router.post("/recommend", response_model=RecommendationResponse)
def recommend_properties(request: RecommendationRequest):
    # 외부 파일/API 처리 중 발생할 수 있는 예외를 안전하게 처리하기 위해 시도함
    try:
        # 계산/조회가 끝난 최종 결과를 호출한 쪽에 반환함
        return recommend(request)
    # 위 처리에서 발생한 예외를 잡아 대체 처리하거나 명확한 오류로 변환함
    except Exception as e:
        # 서비스 오류를 FastAPI HTTP 오류 응답으로 변환함
        raise HTTPException(status_code=500, detail=f"추천 계산 실패: {e}") from e