# FastAPI 앱 생성 및 Router 등록, 서버 진입점

# 이 파일에서 사용할 표준/외부 모듈과 프로젝트 내부 기능 불러옴
from fastapi import FastAPI

from app.routers import admin_ml, neighborhood, place, price, recommendation

# 전세역전 ML API의 FastAPI 애플리케이션 객체를 생성함
app = FastAPI(
    title="전세역전 ML API",
    version="1.0.0",
)

# 시세예측 Router를 FastAPI 앱에 등록함
app.include_router(price.router)
# 맞춤추천 Router를 FastAPI 앱에 등록함
app.include_router(recommendation.router)
# 동네 분석 Router를 FastAPI 앱에 등록함
app.include_router(neighborhood.router)

# 매물 상세 지도에 찍을 주변시설 조회 기능을 앱에 연결함
app.include_router(place.router)
# 관리자 ML 상태 Router를 FastAPI 앱에 등록함
app.include_router(admin_ml.router)


# FastAPI 프로세스가 정상 응답하는지 확인하는 헬스체크 함수임
@app.get("/health")
def health():
    # 계산/조회가 끝난 최종 결과를 호출한 쪽에 반환함
    return {"status": "ok"}


# ML API의 기본 안내정보와 문서/헬스 경로를 반환하는 루트 함수임
@app.get("/")
def root():
    # 계산/조회가 끝난 최종 결과를 호출한 쪽에 반환함
    return {
        "service": "Rentversal ML API",
        "docs": "/docs",
        "health": "/health",
    }