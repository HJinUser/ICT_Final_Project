# 서울 버스정류소 위치 데이터 수집

# 이 파일에서 사용할 표준/외부 모듈과 프로젝트 내부 기능 불러옴
from __future__ import annotations

import pandas as pd
from pyproj import Transformer

from collectors.common import BASE_DIR, clean_number, fetch_seoul_rows

OUT = BASE_DIR / "data" / "reference" / "bus_stops.csv"


# 좌표가 투영좌표이면 WGS84 위경도로 변환하고 이미 위경도면 그대로 반환하는 함수임
def to_wgs84(x: float, y: float) -> tuple[float, float]:
    # 이미 경도/위도처럼 보이면 그대로 사용한다.
    if abs(x) <= 180 and abs(y) <= 90:
        # 계산/조회가 끝난 최종 결과를 호출한 쪽에 반환함
        return y, x

    # 서울 데이터가 투영좌표로 제공되는 경우 EPSG:5179 → WGS84 변환
    transformer = Transformer.from_crs("EPSG:5179", "EPSG:4326", always_xy=True)
    lon, lat = transformer.transform(x, y)
    # 계산/조회가 끝난 최종 결과를 호출한 쪽에 반환함
    return lat, lon


# 서울 버스정류소 API 수집부터 좌표 변환·서울 범위 필터링·CSV 저장까지 실행하는 진입 함수임
def main() -> None:
    rows = fetch_seoul_rows("busStopLocationXyInfo")
    # 수집/가공한 값을 pandas DataFrame 형태로 구성함
    df = pd.DataFrame(rows)

    df["x"] = clean_number(df["XCRD"])
    df["y"] = clean_number(df["YCRD"])
    # 모델이나 계산에 필요한 값이 없는 행을 제거함
    df = df.dropna(subset=["x", "y"])

    coords = df.apply(lambda r: to_wgs84(float(r["x"]), float(r["y"])), axis=1)
    df["latitude"] = coords.map(lambda p: p[0])
    df["longitude"] = coords.map(lambda p: p[1])

    # 수집/가공한 값을 pandas DataFrame 형태로 구성함
    out = pd.DataFrame({
        "name": df["STOPS_NM"].astype(str),
        "station_no": df.get("STOPS_NO", ""),
        "node_id": df.get("NODE_ID", ""),
        "latitude": df["latitude"],
        "longitude": df["longitude"],
    })

    # 서울의 정상적인 위경도 범위로 마지막 검증
    out = out[
        out["latitude"].between(37.3, 37.8)
        & out["longitude"].between(126.7, 127.3)
    ]

    OUT.parent.mkdir(parents=True, exist_ok=True)
    # 정리된 결과를 다음 단계에서 재사용할 CSV 파일로 저장함
    out.to_csv(OUT, index=False, encoding="utf-8-sig")
    print(f"saved: {OUT} / {len(out):,} rows")


if __name__ == "__main__":
    main()