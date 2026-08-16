# 자치구 단위 가격모델 Feature 생성

# 이 파일에서 사용할 외부 모듈과 프로젝트 경로 불러옴
import pandas as pd

from training.spatial_common import PROCESSED, REF

INPUT = PROCESSED / "neighborhood_features.csv"
OUTPUT = PROCESSED / "district_features.csv"


# 행정동 Feature를 자치구 단위 총 개수/총 면적으로 다시 집계해 가격모델 Feature를 만듦
def main() -> None:
    feature = pd.read_csv(INPUT)
    academy_official = pd.read_csv(REF / "academies_official.csv")

    official_count = (
        academy_official.groupby("district_name")
        .size()
        .rename("academy_official_count")
    )

    count_cols = [
        "station_count", "bus_stop_count", "hospital_count", "school_count",
        "mart_count", "convenience_count", "laundry_count", "academy_count", "park_count",
    ]
    agg = {"area_km2": "sum", "park_area_sum": "sum"}
    agg.update({c: "sum" for c in count_cols})

    district = feature.groupby("district_name", as_index=False).agg(agg)

    for prefix in [
        "station", "bus_stop", "hospital", "school", "mart",
        "convenience", "laundry", "academy", "park",
    ]:
        district[f"{prefix}_density"] = (
            district[f"{prefix}_count"] / district["area_km2"].clip(lower=0.1)
        )

    district["park_area_ratio"] = (
        district["park_area_sum"]
        / (district["area_km2"] * 1_000_000).clip(lower=1)
    ).clip(0, 1)

    district = district.merge(official_count, on="district_name", how="left")
    district["academy_official_count"] = district["academy_official_count"].fillna(0)
    district["academy_official_density"] = (
        district["academy_official_count"] / district["area_km2"].clip(lower=0.1)
    )

    district.to_csv(OUTPUT, index=False, encoding="utf-8-sig")
    print(f"saved: {OUTPUT} / {district.shape}")


if __name__ == "__main__":
    main()