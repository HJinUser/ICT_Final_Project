# 설문·서비스 한줄평을 법정동->행정동 매핑으로 확장해 분석용으로 병합

# 이 파일에서 사용할 외부 모듈과 프로젝트 경로 불러옴
import pandas as pd

from collectors.common import BASE_DIR

# 입력·출력 파일 위치를 한 곳에서 재사용할 수 있도록 경로를 미리 정의함.
RAW = BASE_DIR / "data" / "raw" / "text"
REFERENCE = BASE_DIR / "data" / "reference" / "legal_to_admin_dong.csv"
OUTPUT = BASE_DIR / "data" / "processed" / "neighborhood_reviews.csv"


# 응답자가 쓴 구/동네이름을 법정동 정확일치 -> 행정동 정확일치 -> 법정동 접두어 순으로 해석함
def resolve_admin_rows(district_name: str, dong: str, mapping: pd.DataFrame) -> tuple[pd.DataFrame, str]:
    exact_legal = mapping[
        (mapping["district_name"] == district_name) & (mapping["legal_dong"] == dong)
    ]
    # 현재 값이나 상태가 해당 조건에 맞는지 확인한 뒤 필요한 분기 처리를 수행함.
    if not exact_legal.empty:
        return exact_legal, "legal_exact"

    exact_admin = mapping[
        (mapping["district_name"] == district_name) & (mapping["admin_name"] == dong)
    ]
    # 응답자가 법정동 대신 행정동 이름을 그대로 쓴 경우를 처리함
    if not exact_admin.empty:
        return exact_admin, "admin_exact"

    prefix_legal = mapping[
        (mapping["district_name"] == district_name) & (mapping["legal_dong"].str.startswith(dong))
    ]
    # "성수동" 같은 줄임말이 "성수동1가/2가" 등 여러 법정동에 걸치는 경우를 처리함
    if not prefix_legal.empty:
        return prefix_legal, "legal_prefix"

    # 계산이 끝난 결과를 호출한 쪽에서 이어서 사용할 수 있도록 반환함.
    return mapping.iloc[0:0], "unresolved"


# 설문 원본과 선택적인 운영 서비스 export를 법정동->행정동 매핑으로 확장해 병합함
def main() -> None:
    files = [RAW / "survey_reviews.csv"]
    service = RAW / "service_reviews.csv"
    # 현재 값이나 상태가 해당 조건에 맞는지 확인한 뒤 필요한 분기 처리를 수행함.
    if service.exists():
        files.append(service)

    frames = [pd.read_csv(path, dtype=str, encoding="utf-8-sig") for path in files]
    combined = pd.concat(frames, ignore_index=True)

    required = {"district_name", "legal_dong", "text", "source"}
    missing = required - set(combined.columns)
    # 현재 값이나 상태가 해당 조건에 맞는지 확인한 뒤 필요한 분기 처리를 수행함.
    if missing:
        raise RuntimeError(f"한줄평 CSV 필수 컬럼이 없습니다: {sorted(missing)}")

    combined = combined.dropna(subset=["district_name", "legal_dong", "text"])
    # 대상 데이터를 하나씩 순회하면서 각 항목에 동일한 처리 규칙을 적용함.
    for col in ["district_name", "legal_dong", "text"]:
        combined[col] = combined[col].astype(str).str.strip()
    combined = combined[
        combined["district_name"].ne("") & combined["legal_dong"].ne("") & combined["text"].ne("")
    ]

    mapping = pd.read_csv(REFERENCE, dtype=str)

    merged_rows = []
    unresolved_pairs = set()
    # 대상 데이터를 하나씩 순회하면서 각 항목에 동일한 처리 규칙을 적용함.
    for _, row in combined.iterrows():
        matches, method = resolve_admin_rows(row["district_name"], row["legal_dong"], mapping)
        if method == "unresolved":
            unresolved_pairs.add((row["district_name"], row["legal_dong"]))
            continue
        # 대상 데이터를 하나씩 순회하면서 각 항목에 동일한 처리 규칙을 적용함.
        for _, m in matches.iterrows():
            merged_rows.append({
                "admin_code": m["admin_code"],
                "admin_name": m["admin_name"],
                "district_name": row["district_name"],
                "legal_dong": row["legal_dong"],
                "match_type": method,
                "text": row["text"],
                "source": row["source"],
            })

    # 세 단계 모두 실패한 구/동네이름이 있으면 잘못된 응답으로 조용히 흘려보내지 않고 즉시 실패시킴
    if unresolved_pairs:
        raise RuntimeError(f"매핑표에서 해석하지 못한 구/법정동 조합이 있습니다: {sorted(unresolved_pairs)}")

    merged = pd.DataFrame(merged_rows)
    # 같은 의미의 중복 행이 결과에 여러 번 포함되지 않도록 중복을 제거함.
    merged = merged.drop_duplicates(subset=["admin_code", "text"])

    # 저장할 상위 폴더가 없어도 실행될 수 있도록 필요한 디렉터리를 먼저 생성함.
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    merged.to_csv(OUTPUT, index=False, encoding="utf-8-sig")
    print(f"saved: {OUTPUT} / {len(merged):,} rows")
    print(merged["match_type"].value_counts())


if __name__ == "__main__":
    main()