# 법정동-행정동 매핑 원본을 텍스트마이닝 조인용 기준 데이터로 정규화

# 이 파일에서 사용할 외부 모듈과 프로젝트 공통 기능 불러옴
import pandas as pd

from collectors.common import BASE_DIR
from collectors.manual_common import RAW, REF, pick_column, read_csv_flexible

# 입력·출력 파일 위치를 한 곳에서 재사용할 수 있도록 경로를 미리 정의함.
INPUT_DIR = RAW / "legal_admin_mapping"
# K-Means가 실제로 쓰는 행정동 목록임 - 여기 없는 admin_code는 이 프로젝트에서 존재하지 않는 것으로 취급함
CLUSTERS_PATH = BASE_DIR / "outputs" / "neighborhood_clusters.csv"
OUTPUT = REF / "legal_to_admin_dong.csv"


# 원본 법정동-행정동 매핑 파일을 찾아 프로젝트 조인 스키마로 정규화해 저장함
def main() -> None:
    files = list(INPUT_DIR.glob("*.csv")) + list(INPUT_DIR.glob("*.txt"))
    # 현재 값이나 상태가 해당 조건에 맞는지 확인한 뒤 필요한 분기 처리를 수행함.
    if not files:
        raise FileNotFoundError(f"매핑 원본 파일이 없습니다: {INPUT_DIR}")
    if not CLUSTERS_PATH.exists():
        raise FileNotFoundError(f"K-Means 결과 파일이 없습니다: {CLUSTERS_PATH}")

    df = read_csv_flexible(files[0])

    sido_col = pick_column(df, ["시도명", "시도"])
    gu_col = pick_column(df, ["시군구명", "시군구"])
    legal_col = pick_column(df, ["법정동명", "읍면동명", "동리명"])
    admin_name_col = pick_column(df, ["행정동명"])

    out = df[[sido_col, gu_col, legal_col, admin_name_col]].copy()
    out.columns = ["sido_name", "district_name", "legal_dong", "admin_name"]

    # 서울이 아닌 시도 행은 이 프로젝트 범위 밖이므로 제거함
    out = out[out["sido_name"].astype(str).str.startswith("서울")]
    # 대상 데이터를 하나씩 순회하면서 각 항목에 동일한 처리 규칙을 적용함.
    for col in ["district_name", "legal_dong", "admin_name"]:
        out[col] = out[col].astype(str).str.strip()

    # 원본에 시군구 단위 요약행이 섞여 있어 법정동명이 구/시 이름과 같은 행은 실제 동이 아니므로 제거함
    out = out[out["legal_dong"] != out["district_name"]]
    out = out[out["legal_dong"] != out["sido_name"]]

    out = out[["district_name", "legal_dong", "admin_name"]].drop_duplicates()

    # 원본 파일의 행정동코드는 K-Means와 체계가 달라 신뢰하지 않고, 이름으로 K-Means의 실제 admin_code를 다시 붙임
    clusters = pd.read_csv(CLUSTERS_PATH, encoding="utf-8-sig", dtype=str)[
        ["admin_code", "admin_name", "district_name"]
    ]
    merged = out.merge(clusters, on=["district_name", "admin_name"], how="left")

    # K-Means에 없는 행정동(폐지·개편·데이터 시점 차이)은 매핑에서 쓸 수 없으므로 조용히 남기지 않고 알림
    dropped = merged[merged["admin_code"].isna()]
    if not dropped.empty:
        preview = dropped[["district_name", "legal_dong", "admin_name"]].drop_duplicates()
        print(f"[안내] K-Means에 없어 제외된 행정동 {len(preview)}건")
        print(preview.to_string(index=False))

    merged = merged.dropna(subset=["admin_code"])
    merged = merged[["district_name", "legal_dong", "admin_code", "admin_name"]].drop_duplicates()

    # 저장할 상위 폴더가 없어도 실행될 수 있도록 필요한 디렉터리를 먼저 생성함.
    REF.mkdir(parents=True, exist_ok=True)
    merged.to_csv(OUTPUT, index=False, encoding="utf-8-sig")
    print(f"saved: {OUTPUT} / {len(merged):,} rows")


if __name__ == "__main__":
    main()