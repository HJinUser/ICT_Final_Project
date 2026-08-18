# 동네 군집·키워드 API 엔드포인트

# 이 파일에서 사용할 표준/외부 모듈과 프로젝트 내부 기능 불러옴
from fastapi import APIRouter, HTTPException

from app.services.neighborhood_service import find_neighborhood

# 이 기능의 공통 URL prefix와 문서 태그를 FastAPI Router에 설정함.
router = APIRouter(prefix="/ml/neighborhood", tags=["ML Neighborhood"])


# 행정동 분석결과를 조회하고 없으면 404를 반환하는 API 함수임
@router.get("/{admin_code}")
def get_neighborhood(admin_code: str):
    result = find_neighborhood(admin_code)
    # 현재 값이나 상태가 해당 조건에 맞는지 확인한 뒤 필요한 분기 처리를 수행함.
    if result is None:
        # 서비스 오류를 FastAPI HTTP 오류 응답으로 변환함
        raise HTTPException(status_code=404, detail="행정동 분석 결과가 없습니다.")
    # 계산/조회가 끝난 최종 결과를 호출한 쪽에 반환함
    return result