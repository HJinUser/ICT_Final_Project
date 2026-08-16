# 공간조인·시설 집계 공통 기능

# 이 파일에서 사용할 외부 모듈과 프로젝트 공통 기능 불러옴
from __future__ import annotations

import geopandas as gpd
import pandas as pd

from collectors.common import BASE_DIR

REF = BASE_DIR / "data" / "reference"
PROCESSED = BASE_DIR / "data" / "processed"


# 위도·경도 DataFrame을 공간연산 가능한 GeoDataFrame 점 객체로 바꿈
def points_gdf(df: pd.DataFrame) -> gpd.GeoDataFrame:
    return gpd.GeoDataFrame(
        df.copy(),
        geometry=gpd.points_from_xy(df["longitude"], df["latitude"]),
        crs="EPSG:4326",
    )


# 시설 점 데이터를 행정동 경계와 공간 조인해 개수/밀도 Feature를 추가함
def add_category_points(
    boundary: gpd.GeoDataFrame,
    feature: pd.DataFrame,
    df: pd.DataFrame,
    prefix: str,
) -> pd.DataFrame:
    points = points_gdf(df)
    joined = gpd.sjoin(
        points,
        boundary[["admin_code", "geometry"]],
        how="inner",
        predicate="within",
    )

    count = joined.groupby("admin_code").size().rename(f"{prefix}_count")
    feature = feature.merge(count, on="admin_code", how="left")
    feature[f"{prefix}_count"] = feature[f"{prefix}_count"].fillna(0)
    feature[f"{prefix}_density"] = (
        feature[f"{prefix}_count"] / feature["area_km2"].clip(lower=0.05)
    )
    return feature


# reference 시설 데이터를 결합해 행정동 단위 공간 Feature DataFrame을 생성함
def build_neighborhood_feature_frame() -> pd.DataFrame:
    boundary = gpd.read_file(REF / "admin_dong_boundary.geojson").to_crs("EPSG:4326")
    feature = boundary[["admin_code", "admin_name", "district_name", "area_km2"]].copy()

    subway = pd.read_csv(REF / "subway_stations.csv")
    bus = pd.read_csv(REF / "bus_stops.csv")
    hospital = pd.read_csv(REF / "hospitals.csv")
    school = pd.read_csv(REF / "schools.csv")
    park = pd.read_csv(REF / "parks.csv")
    commercial = pd.read_csv(REF / "commercial_pois.csv")

    feature = add_category_points(boundary, feature, subway, "station")
    feature = add_category_points(boundary, feature, bus, "bus_stop")
    feature = add_category_points(boundary, feature, hospital, "hospital")
    feature = add_category_points(boundary, feature, school, "school")

    for category in ["mart", "convenience", "laundry", "academy"]:
        part = commercial[commercial["category"].eq(category)]
        feature = add_category_points(boundary, feature, part, category)

    feature = add_category_points(boundary, feature, park, "park")

    # 공원 면적 비율은 공원 중심점이 속한 행정동 기준 근사치로 계산함
    park_gdf = points_gdf(park)
    park_joined = gpd.sjoin(
        park_gdf,
        boundary[["admin_code", "geometry"]],
        how="inner",
        predicate="within",
    )
    park_area = (
        park_joined.groupby("admin_code")["park_area"]
        .sum(min_count=1)
        .fillna(0)
        .rename("park_area_sum")
    )
    feature = feature.merge(park_area, on="admin_code", how="left")
    feature["park_area_sum"] = feature["park_area_sum"].fillna(0)
    feature["park_area_ratio"] = (
        feature["park_area_sum"]
        / (feature["area_km2"] * 1_000_000).clip(lower=1)
    ).clip(0, 1)

    return feature.fillna(0)