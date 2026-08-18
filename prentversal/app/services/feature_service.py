# 좌표 기준 역거리·주변시설 Feature 계산

# 이 파일에서 사용할 표준/외부 모듈과 프로젝트 내부 기능 불러옴
from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache

import numpy as np
import pandas as pd
from sklearn.neighbors import BallTree

from app.config import REFERENCE_DIR

# 여러 처리에서 공통으로 사용할 설정값을 상수로 미리 정의함.
EARTH_RADIUS_M = 6_371_008.8


@dataclass
# 시설 원본 DataFrame과 해당 좌표로 만든 BallTree를 한 객체에 묶어 보관하는 dataclass임
class PointIndex:
    # 필요한 값만 새 DataFrame 구조로 구성해 이후 처리에서 같은 형태로 사용함.
    frame: pd.DataFrame
    tree: BallTree | None


# 시설 위경도를 Haversine BallTree로 만들어 빠른 거리검색 인덱스를 만드는 함수임
def _make_index(df: pd.DataFrame) -> PointIndex:
    # 모델이나 계산에 필요한 값이 없는 행을 제거함
    clean = df.dropna(subset=["latitude", "longitude"]).copy()

    # 특정 시설 카테고리가 0건이어도 서버 전체가 실패하지 않도록 빈 인덱스로 보관함
    if clean.empty:
        # 계산이 끝난 결과를 호출한 쪽에서 이어서 사용할 수 있도록 반환함.
        return PointIndex(clean.reset_index(drop=True), None)

    radians = np.radians(clean[["latitude", "longitude"]].to_numpy(dtype=float))
    # 정리한 시설 DataFrame과 Haversine BallTree를 PointIndex로 묶어 반환함
    return PointIndex(clean.reset_index(drop=True), BallTree(radians, metric="haversine"))


# 지하철·버스·병원·학교·공원·상가 데이터를 읽어 시설별 BallTree를 한 번만 만드는 함수임
@lru_cache(maxsize=1)
def indexes() -> dict[str, PointIndex]:
    # CSV 파일을 pandas DataFrame으로 불러옴
    subway = pd.read_csv(REFERENCE_DIR / "subway_stations.csv")
    # CSV 파일을 pandas DataFrame으로 불러옴
    bus = pd.read_csv(REFERENCE_DIR / "bus_stops.csv")
    # CSV 파일을 pandas DataFrame으로 불러옴
    hospital = pd.read_csv(REFERENCE_DIR / "hospitals.csv")
    # CSV 파일을 pandas DataFrame으로 불러옴
    school = pd.read_csv(REFERENCE_DIR / "schools.csv")
    # CSV 파일을 pandas DataFrame으로 불러옴
    park = pd.read_csv(REFERENCE_DIR / "parks.csv")
    # CSV 파일을 pandas DataFrame으로 불러옴
    commercial = pd.read_csv(REFERENCE_DIR / "commercial_pois.csv")

    result = {
        "station": _make_index(subway),
        "bus": _make_index(bus),
        "hospital": _make_index(hospital),
        "school": _make_index(school),
        "park": _make_index(park),
    }

    # 대상 데이터를 하나씩 순회하면서 같은 처리 반복함
    for category in ["mart", "convenience", "laundry", "academy"]:
        part = commercial[commercial["category"].eq(category)]
        result[category] = _make_index(part)

    # 계산/조회가 끝난 최종 결과를 호출한 쪽에 반환함
    return result


# 단일 위경도 좌표를 BallTree가 요구하는 라디안 배열 형태로 변환하는 함수임
def _query_point(latitude: float, longitude: float) -> np.ndarray:
    # 계산/조회가 끝난 최종 결과를 호출한 쪽에 반환함
    return np.radians([[latitude, longitude]])


# 현재 매물에서 특정 시설군의 가장 가까운 지점까지 거리를 m 단위로 계산하는 함수임
def nearest_distance_m(index: PointIndex, latitude: float, longitude: float) -> float:
    # 최근접 거리 계산은 기준 시설이 최소 1건 필요하므로 없으면 명확한 오류로 중단함
    if index.tree is None:
        raise RuntimeError("최근접 거리 계산에 사용할 시설 데이터가 없습니다.")

    # BallTree에서 현재 좌표와 가장 가까운 시설 1곳의 거리를 조회함
    distance, _ = index.tree.query(_query_point(latitude, longitude), k=1)
    # 계산/조회가 끝난 최종 결과를 호출한 쪽에 반환함
    return float(distance[0][0] * EARTH_RADIUS_M)


# 현재 매물 반경 안에 있는 특정 시설의 개수를 계산하는 함수임
def count_within_m(
    index: PointIndex,
    latitude: float,
    longitude: float,
    radius_m: float,
) -> int:
    # 해당 시설 카테고리의 데이터가 0건이면 반경 내 개수도 0으로 처리함
    if index.tree is None:
        # 계산이 끝난 결과를 호출한 쪽에서 이어서 사용할 수 있도록 반환함.
        return 0

    radius_radian = radius_m / EARTH_RADIUS_M
    # BallTree에서 지정 반경 안에 들어오는 시설 인덱스들을 조회함
    found = index.tree.query_radius(_query_point(latitude, longitude), r=radius_radian)
    # 계산/조회가 끝난 최종 결과를 호출한 쪽에 반환함
    return int(len(found[0]))


# 매물 좌표 하나로 역거리와 반경별 주변시설 개수를 한 번에 계산하는 함수임
def get_nearby_features(latitude: float, longitude: float) -> dict[str, float | int]:
    idx = indexes()
    # 계산/조회가 끝난 최종 결과를 호출한 쪽에 반환함
    return {
        "nearest_station_distance_m": round(
            nearest_distance_m(idx["station"], latitude, longitude), 1
        ),
        "station_count_1000m": count_within_m(idx["station"], latitude, longitude, 1000),
        "bus_count_500m": count_within_m(idx["bus"], latitude, longitude, 500),
        "hospital_count_1000m": count_within_m(idx["hospital"], latitude, longitude, 1000),
        "mart_count_1000m": count_within_m(idx["mart"], latitude, longitude, 1000),
        "convenience_count_500m": count_within_m(idx["convenience"], latitude, longitude, 500),
        "laundry_count_1000m": count_within_m(idx["laundry"], latitude, longitude, 1000),
        "school_count_1000m": count_within_m(idx["school"], latitude, longitude, 1000),
        "academy_count_1000m": count_within_m(idx["academy"], latitude, longitude, 1000),
        "park_count_1000m": count_within_m(idx["park"], latitude, longitude, 1000),
    }