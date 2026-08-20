# 시세 예측 요청·응답 Pydantic Schema

# 이 파일에서 사용할 표준/외부 모듈과 프로젝트 내부 기능 불러옴
from __future__ import annotations

from pydantic import BaseModel, Field


# Spring이 FastAPI 시세예측 API에 보내는 매물 유형·거래유형·지역·면적·좌표 입력 Schema임
class PricePredictRequest(BaseModel):
    propertyType: str
    dealType: str
    districtName: str
    area: float = Field(gt=0)
    floor: int | None = None
    buildYear: int | None = None
    latitude: float
    longitude: float


# 예측 응답에 포함할 최근접 역거리와 반경별 주변시설 개수 구조를 정의하는 Schema임
class NearbyFeatures(BaseModel):
    nearest_station_distance_m: float
    station_count_1000m: int
    bus_count_500m: int
    hospital_count_1000m: int
    mart_count_1000m: int
    convenience_count_500m: int
    laundry_count_1000m: int
    school_count_1000m: int
    academy_count_1000m: int
    park_count_1000m: int


# 거래유형별 AI 예측가격·역거리·주변시설·모델버전을 내려주는 응답 Schema임
class PricePredictResponse(BaseModel):
    aiPrice: int | None = None
    aiDeposit: int | None = None
    aiMonthlyDeposit: int | None = None
    aiMonthlyRent: int | None = None
    stationDistance: float | None = None
    # 좌표로 판정한 행정동. 서울 경계 밖이면 둘 다 None임
    adminCode: str | None = None
    adminName: str | None = None
    nearby: NearbyFeatures
    modelVersion: str