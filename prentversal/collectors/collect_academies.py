# 서울 학원·교습소 데이터 수집

# 이 파일에서 사용할 표준/외부 모듈과 프로젝트 내부 기능 불러옴
from __future__ import annotations

import pandas as pd

from collectors.common import BASE_DIR, fetch_seoul_rows

# 입력·출력 파일 위치를 한 곳에서 재사용할 수 있도록 경로를 미리 정의함.
OUT = BASE_DIR / "data" / "reference" / "academies_official.csv"


# 서울 학원·교습소 API를 수집하고 운영 상태·중복을 정리해 CSV로 저장하는 진입 함수임
def main() -> None:
    rows = fetch_seoul_rows("neisAcademyInfo")
    # 수집/가공한 값을 pandas DataFrame 형태로 구성함
    df = pd.DataFrame(rows)

    # 현재 값이나 상태가 해당 조건에 맞는지 확인한 뒤 필요한 분기 처리를 수행함.
    if "REG_STTS_NM" in df.columns:
        # 폐원 등 명확한 비운영 상태를 제거함
        status = df["REG_STTS_NM"].fillna("").astype(str)
        df = df[~status.str.contains("폐원", na=False)].copy()

    # 수집/가공한 값을 pandas DataFrame 형태로 구성함
    out = pd.DataFrame({
        "district_name": df["ADMDST_NM"].astype(str).str.strip(),
        "name": df["PEI_NM"].astype(str).str.strip(),
        "category": df["FLD_NM"].astype(str).str.strip(),
        "course": df["TRNG_CRS_NM"].astype(str).str.strip(),
        "address": df["ROAD_NM_ADDR"].astype(str).str.strip(),
    })

    # 같은 데이터가 중복 저장되지 않도록 중복 행 제거함
    out = out[out["name"].ne("")].drop_duplicates()
    # 저장할 상위 폴더가 없어도 실행될 수 있도록 필요한 디렉터리를 먼저 생성함.
    OUT.parent.mkdir(parents=True, exist_ok=True)
    # 정리된 결과를 다음 단계에서 재사용할 CSV 파일로 저장함
    out.to_csv(OUT, index=False, encoding="utf-8-sig")
    print(f"saved: {OUT} / {len(out):,} rows")


if __name__ == "__main__":
    main()