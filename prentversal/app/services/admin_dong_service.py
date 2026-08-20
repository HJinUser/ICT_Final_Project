# 좌표를 행정동으로 판정

# 이 파일에서 사용할 표준/외부 모듈과 프로젝트 내부 기능 불러옴
from __future__ import annotations

import json
from functools import lru_cache

import numpy as np

from app.config import REFERENCE_DIR

# 13-6 normalize_admin_boundary.py가 만든 행정동 경계임. K-Means와 같은 admin_code를 쓴다.
BOUNDARY_PATH = REFERENCE_DIR / "admin_dong_boundary.geojson"


# 경계 GeoJSON을 읽어 판정에 바로 쓸 수 있는 배열 묶음으로 바꿔 캐시하는 함수임
@lru_cache(maxsize=1)
def _boundaries() -> tuple[list[np.ndarray], np.ndarray, list[dict]]:
    # 파일이 없으면 판정 자체를 할 수 없으므로 원인을 분명히 밝히고 중단함
    try:
        with BOUNDARY_PATH.open(encoding="utf-8") as fp:
            geojson = json.load(fp)
    except FileNotFoundError as error:
        raise FileNotFoundError(
            f"행정동 경계 파일이 없습니다: {BOUNDARY_PATH}"
        ) from error

    rings: list[np.ndarray] = []
    boxes: list[tuple[float, float, float, float]] = []
    props: list[dict] = []

    for feature in geojson.get("features", []):
        geometry = feature.get("geometry") or {}
        # 13-6이 만드는 경계는 구멍 없는 단일 링 Polygon뿐이다. 그 밖의 도형은 건너뛴다.
        if geometry.get("type") != "Polygon":
            continue

        coordinates = geometry.get("coordinates") or []
        if not coordinates:
            continue

        # GeoJSON 좌표는 (경도, 위도) 순서임에 주의함
        ring = np.asarray(coordinates[0], dtype=float)
        if ring.ndim != 2 or ring.shape[0] < 4:
            continue

        rings.append(ring)
        boxes.append(
            (
                float(ring[:, 0].min()),
                float(ring[:, 1].min()),
                float(ring[:, 0].max()),
                float(ring[:, 1].max()),
            )
        )

        source = feature.get("properties") or {}
        props.append(
            {
                "adminCode": str(source.get("admin_code")),
                "adminName": str(source.get("admin_name")),
                "districtName": str(source.get("district_name")),
            }
        )

    # 경계가 하나도 없으면 이후 모든 판정이 조용히 실패하므로 여기서 막음
    if not rings:
        raise ValueError(f"행정동 경계를 하나도 읽지 못했습니다: {BOUNDARY_PATH}")

    # 계산/조회가 끝난 최종 결과를 호출한 쪽에 반환함
    return rings, np.asarray(boxes, dtype=float), props


# 점 하나가 링 안에 있는지 짝수-홀수 규칙(ray casting)으로 판정하는 함수임
def _inside(longitude: float, latitude: float, ring: np.ndarray) -> bool:
    x1 = ring[:, 0]
    y1 = ring[:, 1]
    x2 = np.roll(x1, -1)
    y2 = np.roll(y1, -1)

    # 점의 위도를 가로지르는 변만 남김. 수평인 변은 두 항이 같아져 자동으로 빠진다.
    crossing = (y1 > latitude) != (y2 > latitude)
    # 남는 변이 없으면 링 밖이므로 나눗셈을 하지 않고 끝냄
    if not crossing.any():
        # 계산/조회가 끝난 최종 결과를 호출한 쪽에 반환함
        return False

    # 걸러 낸 변만 계산해서 0으로 나누는 경우를 아예 만들지 않음
    x1 = x1[crossing]
    y1 = y1[crossing]
    x2 = x2[crossing]
    y2 = y2[crossing]

    # 각 변이 점의 위도와 만나는 지점의 경도를 구함
    meet = (x2 - x1) * (latitude - y1) / (y2 - y1) + x1

    # 점의 오른쪽에서 만나는 횟수가 홀수면 링 안쪽임
    # 계산/조회가 끝난 최종 결과를 호출한 쪽에 반환함
    return bool(np.count_nonzero(longitude < meet) % 2 == 1)


# 위경도 좌표가 속한 행정동을 찾아 코드·이름·자치구를 반환하는 함수임
def resolve_admin_dong(latitude: float, longitude: float) -> dict | None:
    # 좌표가 없거나 숫자가 아니면 판정하지 않음
    if latitude is None or longitude is None:
        # 계산/조회가 끝난 최종 결과를 호출한 쪽에 반환함
        return None

    try:
        lat = float(latitude)
        lon = float(longitude)
    except (TypeError, ValueError):
        # 계산/조회가 끝난 최종 결과를 호출한 쪽에 반환함
        return None

    # NaN 이 들어오면 아래 비교가 모두 False가 되어 조용히 못 찾은 것처럼 보이므로 먼저 막음
    if not (np.isfinite(lat) and np.isfinite(lon)):
        # 계산/조회가 끝난 최종 결과를 호출한 쪽에 반환함
        return None

    rings, boxes, props = _boundaries()

    # 425개를 전부 훑지 않도록 사각 범위로 후보를 먼저 좁힘
    candidates = np.nonzero(
        (boxes[:, 0] <= lon)
        & (lon <= boxes[:, 2])
        & (boxes[:, 1] <= lat)
        & (lat <= boxes[:, 3])
    )[0]

    for index in candidates:
        # 후보 중 실제로 경계 안에 들어가는 첫 행정동을 답으로 씀
        if _inside(lon, lat, rings[index]):
            # 계산/조회가 끝난 최종 결과를 호출한 쪽에 반환함
            return dict(props[index])

    # 서울 밖 좌표이거나 경계에서 벗어난 경우임
    # 계산/조회가 끝난 최종 결과를 호출한 쪽에 반환함
    return None
