# 매물 주변시설 API 엔드포인트

# 이 파일에서 사용할 표준/외부 모듈과 프로젝트 내부 기능 불러옴
from fastapi import APIRouter, HTTPException

from app.schemas.place import NearbyPlaceResponse
from app.services.feature_service import get_nearby_places

# 이 기능의 공통 URL prefix와 문서 태그를 FastAPI Router에 설정함.
router = APIRouter(prefix="/ml/place", tags=["ML Place"])


# 매물 좌표를 받아 반경 안의 지하철·버스·병원·편의점을 좌표와 함께 반환하는 API 함수임
@router.get("/nearby", response_model=NearbyPlaceResponse)
def nearby(lat: float, lng: float):
    # 외부 파일 처리 중 발생할 수 있는 예외를 안전하게 처리하기 위해 시도함
    try:
        # 계산/조회가 끝난 최종 결과를 호출한 쪽에 반환함
        return get_nearby_places(lat, lng)
    # 위 처리에서 발생한 예외를 잡아 대체 처리하거나 명확한 오류로 변환함
    except FileNotFoundError as e:
        # 서비스 오류를 FastAPI HTTP 오류 응답으로 변환함
        raise HTTPException(status_code=503, detail=f"시설 데이터가 없습니다: {e}") from e
