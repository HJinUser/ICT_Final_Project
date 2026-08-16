# 상가 원본에서 생활편의시설 POI 추출

# 이 파일에서 사용할 외부 모듈과 프로젝트 공통 기능 불러옴
import pandas as pd

from collectors.common import clean_number
from collectors.manual_common import RAW, REF, extract_district, pick_column, read_csv_flexible

OUTPUT = REF / "commercial_pois.csv"


# 상가 업종 문자열을 편의점·세탁·마트·학원 카테고리로 분류함
def classify_commercial(row: pd.Series, name_cols: list[str]) -> str | None:
    text = " ".join(str(row.get(c, "")) for c in name_cols).lower()

    if "편의점" in text:
        return "convenience"
    if any(k in text for k in ["세탁", "빨래방", "세탁소"]):
        return "laundry"
    if any(k in text for k in ["슈퍼", "마트", "대형마트", "식료품 종합 소매"]):
        return "mart"
    if any(k in text for k in ["학원", "교습", "교육", "입시"]):
        return "academy"
    return None


# 서울 상가 원본에서 필요한 생활편의 업종만 추려 공통 POI 파일로 저장함
def main() -> None:
    df = read_csv_flexible(RAW / "commercial_raw.csv")

    lat_col = pick_column(df, ["위도", "lat", "latitude"])
    lon_col = pick_column(df, ["경도", "lon", "longitude"])
    name_col = pick_column(df, ["상호명", "상가업소명"])
    address_col = pick_column(df, ["도로명주소", "지번주소"])

    category_candidates = [
        c for c in df.columns
        if any(key in str(c) for key in ["업종", "산업분류", "소분류", "중분류", "대분류"])
    ]

    df["category"] = df.apply(
        lambda row: classify_commercial(row, category_candidates), axis=1
    )
    df = df[df["category"].notna()].copy()

    out = pd.DataFrame({
        "name": df[name_col].astype(str).str.strip(),
        "category": df["category"],
        "address": df[address_col].astype(str).str.strip(),
        "latitude": clean_number(df[lat_col]),
        "longitude": clean_number(df[lon_col]),
    })
    out["district_name"] = out["address"].map(extract_district)
    out = out[out["district_name"].notna()]
    out = out.dropna(subset=["latitude", "longitude"])
    out = out.drop_duplicates(subset=["name", "address", "category"])

    REF.mkdir(parents=True, exist_ok=True)
    out.to_csv(OUTPUT, index=False, encoding="utf-8-sig")
    print(out["category"].value_counts())
    print(f"saved: {OUTPUT} / {len(out):,} rows")


if __name__ == "__main__":
    main()