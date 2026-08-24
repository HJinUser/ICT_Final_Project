# 법정동 -> 행정동 매핑 조회

# 이 파일에서 사용할 표준/외부 모듈과 프로젝트 내부 기능 불러옴
from __future__ import annotations

from functools import lru_cache

import pandas as pd

from app.config import REFERENCE_DIR

# D-1 텍스트마이닝(19-3-1)이 만든 매핑표.
# 정부 원본(법정동 연계정보)의 admin_code 를 버리고 K-Means outputs/neighborhood_clusters.csv 의
# admin_code 로 다시 맞춘 파일이라, 이 값은 K-Means/텍스트마이닝과 항상 같은 기준을 쓴다.
MAPPING_PATH = REFERENCE_DIR / "legal_to_admin_dong.csv"


# 매핑표를 (자치구, 법정동) 키로 한 번만 읽어 캐시하는 함수임
@lru_cache(maxsize=1)
def _mapping() -> dict[tuple[str, str], dict]:
    frame = pd.read_csv(MAPPING_PATH, encoding="utf-8-sig")

    lookup: dict[tuple[str, str], dict] = {}

    # 대상 데이터를 하나씩 순회하면서 같은 처리 반복함
    for _, row in frame.iterrows():
        key = (str(row["district_name"]).strip(), str(row["legal_dong"]).strip())

        # 법정동 1개가 행정동 여러 개로 갈리는 경우(467개 중 137개)가 있다.
        # 그중 정확한 하나를 알 방법이 없으므로, 매핑표에 먼저 나오는 행을 대표값으로 쓴다.
        if key in lookup:
            continue

        lookup[key] = {
            "adminCode": str(row["admin_code"]),
            "adminName": str(row["admin_name"]),
        }

    # 계산/조회가 끝난 최종 결과를 호출한 쪽에 반환함
    return lookup


# 자치구·법정동 이름으로 행정동 코드를 찾는 함수임. 없으면 None.
def resolve_legal_dong(district_name: str, legal_dong: str) -> dict | None:
    key = (str(district_name).strip(), str(legal_dong).strip())
    # 계산/조회가 끝난 최종 결과를 호출한 쪽에 반환함
    return _mapping().get(key)
