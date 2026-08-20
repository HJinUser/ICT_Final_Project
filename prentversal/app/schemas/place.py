# 매물 주변시설 응답 Pydantic Schema

# 이 파일에서 사용할 표준/외부 모듈과 프로젝트 내부 기능 불러옴
from __future__ import annotations

from pydantic import BaseModel


# 지도에 찍을 시설 한 곳의 이름·좌표·매물로부터의 거리를 담는 Schema임
class NearbyPlace(BaseModel):
    name: str
    latitude: float
    longitude: float
    distanceM: float


# 매물 상세 지도에 표시할 시설을 종류별로 나눠 내려주는 응답 Schema임
# 반경은 종류마다 다르며 시세예측이 세는 반경과 같은 값을 쓴다.
class NearbyPlaceResponse(BaseModel):
    # 지하철역 (반경 1km)
    station: list[NearbyPlace] = []
    # 버스정류소 (반경 500m)
    bus: list[NearbyPlace] = []
    # 병원 (반경 1km)
    hospital: list[NearbyPlace] = []
    # 편의점 (반경 500m)
    convenience: list[NearbyPlace] = []
