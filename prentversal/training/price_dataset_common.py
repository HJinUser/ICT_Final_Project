# 가격 학습 데이터 생성 공통 처리

# 이 파일에서 사용할 외부 모듈과 프로젝트 공통 경로 불러옴
import pandas as pd

from collectors.common import BASE_DIR

RAW = BASE_DIR / "data" / "raw" / "api"
PROCESSED = BASE_DIR / "data" / "processed"

DISTRICT_FEATURE_COLUMNS = [
    "district_name",
    "station_density",
    "bus_stop_density",
    "hospital_density",
    "mart_density",
    "convenience_density",
    "laundry_density",
    "school_density",
    "academy_density",
    "academy_official_density",
    "park_density",
    "park_area_ratio",
]


# 거래원본에 자치구 Feature를 붙이고 공통 이상값을 정리한 학습 DataFrame을 반환함
def build_price_dataset(raw_file_name: str) -> pd.DataFrame:
    tx = pd.read_csv(RAW / raw_file_name)
    district = pd.read_csv(PROCESSED / "district_features.csv")

    merged = tx.merge(
        district[DISTRICT_FEATURE_COLUMNS],
        on="district_name",
        how="inner",
    )

    # 극단적인 잘못된 면적값만 1차 제거함
    merged = merged[merged["area"].between(5, 500)]

    # 미래 연도/비정상 건축년도 제거. 결측은 학습 Pipeline의 median imputer가 처리함
    valid_year = merged["build_year"].isna() | merged["build_year"].between(1900, 2026)
    merged = merged[valid_year]
    return merged