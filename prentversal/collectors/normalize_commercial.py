# 상가 원본에서 생활편의시설 POI 추출

# 이 파일에서 사용할 외부 모듈과 프로젝트 공통 기능 불러옴
import pandas as pd

from collectors.common import clean_number
from collectors.manual_common import RAW, REF, extract_district, pick_column, read_csv_flexible

# 입력·출력 파일 위치를 한 곳에서 재사용할 수 있도록 경로를 미리 정의함.
OUTPUT = REF / "commercial_pois.csv"


# 상가 업종 문자열을 편의점·세탁·마트·학원 카테고리로 분류함
def classify_commercial(row: pd.Series, name_cols: list[str]) -> str | None:
    text = " ".join(str(row.get(c, "")) for c in name_cols).lower()

    # 현재 값이나 상태가 해당 조건에 맞는지 확인한 뒤 필요한 분기 처리를 수행함.
    if "편의점" in text:
        return "convenience"
    if any(k in text for k in ["세탁", "빨래방", "세탁소"]):
        return "laundry"
    # 현재 값이나 상태가 해당 조건에 맞는지 확인한 뒤 필요한 분기 처리를 수행함.
    if any(k in text for k in ["슈퍼", "마트", "대형마트", "식료품 종합 소매"]):
        return "mart"
    if any(k in text for k in ["학원", "교습", "교육", "입시"]):
        return "academy"
    # 계산이 끝난 결과를 호출한 쪽에서 이어서 사용할 수 있도록 반환함.
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

    # 각 행 또는 값에 같은 함수를 적용해 파생값을 계산함.
    df["category"] = df.apply(
        lambda row: classify_commercial(row, category_candidates), axis=1
    )
    df = df[df["category"].notna()].copy()

    # 필요한 값만 새 DataFrame 구조로 구성해 이후 처리에서 같은 형태로 사용함.
    out = pd.DataFrame({
        "name": df[name_col].astype(str).str.strip(),
        "category": df["category"],
        "address": df[address_col].astype(str).str.strip(),
        "latitude": clean_number(df[lat_col]),
        "longitude": clean_number(df[lon_col]),
    })
    # 각 행의 값을 미리 정한 변환 규칙에 따라 새로운 값으로 매핑함.
    out["district_name"] = out["address"].map(extract_district)
    out = out[out["district_name"].notna()]
    out = out.dropna(subset=["latitude", "longitude"])
    out = out.drop_duplicates(subset=["name", "address", "category"])

    # 저장할 상위 폴더가 없어도 실행될 수 있도록 필요한 디렉터리를 먼저 생성함.
    REF.mkdir(parents=True, exist_ok=True)
    out.to_csv(OUTPUT, index=False, encoding="utf-8-sig")
    print(out["category"].value_counts())
    print(f"saved: {OUTPUT} / {len(out):,} rows")


if __name__ == "__main__":
    main()