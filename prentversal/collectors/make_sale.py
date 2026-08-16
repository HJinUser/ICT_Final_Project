# 매매 API 원본을 학습 전 구조로 정리

# 이 파일에서 사용할 외부 모듈과 프로젝트 공통 기능 불러옴
import pandas as pd

from collectors.common import BASE_DIR, clean_number, normalize_property_type

INPUT = BASE_DIR / "data" / "raw" / "api" / "sale_api_raw.csv"
OUTPUT = BASE_DIR / "data" / "raw" / "api" / "sale_raw.csv"


# 매매 API 원본을 모델 학습 전 공통 컬럼 구조로 정리해 저장함
def main() -> None:
    df = pd.read_csv(INPUT, low_memory=False)

    df["property_type"] = df["BLDG_USG"].map(normalize_property_type)
    df["target_price"] = clean_number(df["THING_AMT"])
    df["area"] = clean_number(df["ARCH_AREA"])
    df["floor"] = clean_number(df["FLR"])
    df["build_year"] = clean_number(df["ARCH_YR"])

    # 취소된 거래는 가격 학습 정답으로 사용하지 않도록 제외함
    if "RTRCN_DAY" in df.columns:
        cancelled = df["RTRCN_DAY"].fillna("").astype(str).str.strip().ne("")
        df = df.loc[~cancelled].copy()

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
        "target_price": df["target_price"],
    })

    out = out.dropna(
        subset=["property_type", "district_name", "area", "target_price"]
    )
    out = out[(out["area"] > 0) & (out["target_price"] > 0)]
    out.to_csv(OUTPUT, index=False, encoding="utf-8-sig")
    print(f"saved: {OUTPUT} / {len(out):,} rows")


if __name__ == "__main__":
    main()