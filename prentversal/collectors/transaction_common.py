# 전월세 API 원본 공통 정리 기능

# 이 파일에서 사용할 외부 모듈과 프로젝트 공통 기능 불러옴
import pandas as pd

from collectors.common import BASE_DIR, clean_number, normalize_property_type

# 입력·출력 파일 위치를 한 곳에서 재사용할 수 있도록 경로를 미리 정의함.
RENT_INPUT = BASE_DIR / "data" / "raw" / "api" / "rent_api_raw.csv"


# 한 번 수집한 전월세 API 원본을 전세/월세가 공유할 공통 컬럼으로 정리해 반환함
def load_rent_base() -> pd.DataFrame:
    # 다음 계산에 사용할 입력 데이터를 파일에서 DataFrame으로 불러옴.
    df = pd.read_csv(RENT_INPUT, low_memory=False)

    df["property_type"] = df["BLDG_USG"].map(normalize_property_type)
    df["area"] = clean_number(df["RENT_AREA"])
    df["floor"] = clean_number(df["FLR"])
    df["build_year"] = clean_number(df["ARCH_YR"])
    df["deposit"] = clean_number(df["GRFE"])
    df["monthly_rent"] = clean_number(df["RTFE"])

    # 필요한 값만 새 DataFrame 구조로 구성해 이후 처리에서 같은 형태로 사용함.
    out = pd.DataFrame({
        "contract_date": df["CTRT_DAY"].astype(str),
        "district_code": df["CGG_CD"].astype(str),
        "district_name": df["CGG_NM"].astype(str),
        "legal_dong_code": df["STDG_CD"].astype(str),
        "legal_dong_name": df["STDG_NM"].astype(str),
        "property_type": df["property_type"],
        "area": df["area"],
        "floor": df["floor"],
        "build_year": df["build_year"],
        "rent_type": df["RENT_SE"].astype(str).str.strip(),
        "deposit": df["deposit"],
        "monthly_rent": df["monthly_rent"],
    })

    # 필수값이 없는 행을 제거해 이후 계산이나 학습에 사용할 수 있는 데이터만 남김.
    out = out.dropna(
        subset=["property_type", "district_name", "area", "deposit"]
    )
    out = out[out["area"] > 0]
    # 계산이 끝난 결과를 호출한 쪽에서 이어서 사용할 수 있도록 반환함.
    return out