# 공원 원본을 공통 좌표 구조로 정규화

# 이 파일에서 사용할 외부 모듈과 프로젝트 공통 기능 불러옴
import pandas as pd

from collectors.common import clean_number
from collectors.manual_common import RAW, REF, extract_district, pick_column, read_csv_flexible

# 입력·출력 파일 위치를 한 곳에서 재사용할 수 있도록 경로를 미리 정의함.
OUTPUT = REF / "parks.csv"


# 원본 공원 CSV를 서울 공원 중심의 공통 컬럼 구조로 정규화해 저장함
def main() -> None:
    df = read_csv_flexible(RAW / "parks_raw.csv")

    name_col = pick_column(df, ["공원명"])
    type_col = pick_column(df, ["공원구분", "공원구분명"])
    address_col = pick_column(df, ["소재지도로명주소", "소재지지번주소"])
    lat_col = pick_column(df, ["위도"])
    lon_col = pick_column(df, ["경도"])
    area_col = pick_column(df, ["공원면적"])

    # 필요한 값만 새 DataFrame 구조로 구성해 이후 처리에서 같은 형태로 사용함.
    out = pd.DataFrame({
        "name": df[name_col].astype(str).str.strip(),
        "park_type": df[type_col].astype(str).str.strip(),
        "address": df[address_col].astype(str).str.strip(),
        "latitude": clean_number(df[lat_col]),
        "longitude": clean_number(df[lon_col]),
        "park_area": clean_number(df[area_col]),
    })
    # 각 행의 값을 미리 정한 변환 규칙에 따라 새로운 값으로 매핑함.
    out["district_name"] = out["address"].map(extract_district)
    out = out[out["district_name"].notna()]
    out = out.dropna(subset=["latitude", "longitude"])

    # 저장할 상위 폴더가 없어도 실행될 수 있도록 필요한 디렉터리를 먼저 생성함.
    REF.mkdir(parents=True, exist_ok=True)
    out.to_csv(OUTPUT, index=False, encoding="utf-8-sig")
    print(f"saved: {OUTPUT} / {len(out):,} rows")


if __name__ == "__main__":
    main()