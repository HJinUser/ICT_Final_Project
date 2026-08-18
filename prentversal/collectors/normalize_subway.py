# 지하철 원본을 공통 좌표 구조로 정규화

# 이 파일에서 사용할 외부 모듈과 프로젝트 공통 기능 불러옴
import pandas as pd

from collectors.common import clean_number
from collectors.manual_common import RAW, REF, extract_district, pick_column

# 입력·출력 파일 위치를 한 곳에서 재사용할 수 있도록 경로를 미리 정의함.
OUTPUT = REF / "subway_stations.csv"


# 원본 지하철 XLSX를 서울 역사 공통 컬럼 구조로 정규화해 저장함
def main() -> None:
    # 다음 계산에 사용할 입력 데이터를 파일에서 DataFrame으로 불러옴.
    df = pd.read_excel(RAW / "subway_raw.xlsx")

    name_col = pick_column(df, ["역사명", "역명"])
    line_col = pick_column(df, ["노선명", "호선"])
    lat_col = pick_column(df, ["위도", "역위도"])
    lon_col = pick_column(df, ["경도", "역경도"])
    address_col = pick_column(df, ["도로명주소", "역사도로명주소", "주소"])

    # 필요한 값만 새 DataFrame 구조로 구성해 이후 처리에서 같은 형태로 사용함.
    out = pd.DataFrame({
        "name": df[name_col].astype(str).str.strip(),
        "line": df[line_col].astype(str).str.strip(),
        "address": df[address_col].astype(str).str.strip(),
        "latitude": clean_number(df[lat_col]),
        "longitude": clean_number(df[lon_col]),
    })
    # 각 행의 값을 미리 정한 변환 규칙에 따라 새로운 값으로 매핑함.
    out["district_name"] = out["address"].map(extract_district)

    out = out[
        out["latitude"].between(37.3, 37.8)
        & out["longitude"].between(126.7, 127.3)
    ].drop_duplicates(subset=["name", "line"])

    # 저장할 상위 폴더가 없어도 실행될 수 있도록 필요한 디렉터리를 먼저 생성함.
    REF.mkdir(parents=True, exist_ok=True)
    out.to_csv(OUTPUT, index=False, encoding="utf-8-sig")
    print(f"saved: {OUTPUT} / {len(out):,} rows")


if __name__ == "__main__":
    main()