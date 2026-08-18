# 매매 API 원본을 학습 전 구조로 정리

# 이 파일에서 사용할 외부 모듈과 프로젝트 공통 기능 불러옴
import pandas as pd

from collectors.common import BASE_DIR, clean_number, normalize_property_type

# 입력·출력 파일 위치를 한 곳에서 재사용할 수 있도록 경로를 미리 정의함.
INPUT = BASE_DIR / "data" / "raw" / "api" / "sale_api_raw.csv"
OUTPUT = BASE_DIR / "data" / "raw" / "api" / "sale_raw.csv"


# 매매 API 원본을 모델 학습 전 공통 컬럼 구조로 정리해 저장함
def main() -> None:
    # 다음 계산에 사용할 입력 데이터를 파일에서 DataFrame으로 불러옴.
    df = pd.read_csv(INPUT, low_memory=False)

    df["property_type"] = df["BLDG_USG"].map(normalize_property_type)
    df["target_price"] = clean_number(df["THING_AMT"])
    df["area"] = clean_number(df["ARCH_AREA"])
    df["floor"] = clean_number(df["FLR"])
    df["build_year"] = clean_number(df["ARCH_YR"])

    # 취소된 거래는 가격 학습 정답으로 사용하지 않도록 제외함
    if "RTRCN_DAY" in df.columns:
        # 결측값 때문에 계산이 중단되지 않도록 필요한 기본값으로 보정함.
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

    # 필수값이 없는 행을 제거해 이후 계산이나 학습에 사용할 수 있는 데이터만 남김.
    out = out.dropna(
        subset=["property_type", "district_name", "area", "target_price"]
    )
    out = out[(out["area"] > 0) & (out["target_price"] > 0)]
    # 처리가 끝난 결과를 다음 단계에서 다시 사용할 수 있도록 파일로 저장함.
    out.to_csv(OUTPUT, index=False, encoding="utf-8-sig")
    print(f"saved: {OUTPUT} / {len(out):,} rows")


if __name__ == "__main__":
    main()