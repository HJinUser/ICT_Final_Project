# 시세 예측 API 엔드포인트

# 이 파일에서 사용할 표준/외부 모듈과 프로젝트 내부 기능 불러옴
from fastapi import APIRouter, HTTPException

from app.schemas.price import PricePredictRequest, PricePredictResponse
from app.services.price_service import predict_price

# 이 기능의 공통 URL prefix와 문서 태그를 FastAPI Router에 설정함.
router = APIRouter(prefix="/ml/price", tags=["ML Price"])


# 시세예측 요청을 서비스 함수에 넘기고 오류를 HTTP 응답으로 변환하는 API 함수임
@router.post("/predict", response_model=PricePredictResponse)
def predict(request: PricePredictRequest):
    # 외부 파일/API 처리 중 발생할 수 있는 예외를 안전하게 처리하기 위해 시도함
    try:
        # 계산/조회가 끝난 최종 결과를 호출한 쪽에 반환함
        return predict_price(request)
    # 위 처리에서 발생한 예외를 잡아 대체 처리하거나 명확한 오류로 변환함
    except ValueError as e:
        # 서비스 오류를 FastAPI HTTP 오류 응답으로 변환함
        raise HTTPException(status_code=400, detail=str(e)) from e
    # 위 처리에서 발생한 예외를 잡아 대체 처리하거나 명확한 오류로 변환함
    except FileNotFoundError as e:
        # 서비스 오류를 FastAPI HTTP 오류 응답으로 변환함
        raise HTTPException(status_code=503, detail=f"모델 파일이 없습니다: {e}") from e