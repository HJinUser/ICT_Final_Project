# 수동 다운로드 데이터 정규화 공통 기능

# 이 파일에서 사용할 표준/외부 모듈과 프로젝트 내부 기능 불러옴
from __future__ import annotations

import re
from pathlib import Path

import pandas as pd

from collectors.common import BASE_DIR

# 입력·출력 파일 위치를 한 곳에서 재사용할 수 있도록 경로를 미리 정의함.
RAW = BASE_DIR / "data" / "raw" / "manual"
REF = BASE_DIR / "data" / "reference"

SEOUL_DISTRICT_CODES = {
    "11110": "종로구", "11140": "중구", "11170": "용산구", "11200": "성동구",
    "11215": "광진구", "11230": "동대문구", "11260": "중랑구", "11290": "성북구",
    "11305": "강북구", "11320": "도봉구", "11350": "노원구", "11380": "은평구",
    "11410": "서대문구", "11440": "마포구", "11470": "양천구", "11500": "강서구",
    "11530": "구로구", "11545": "금천구", "11560": "영등포구", "11590": "동작구",
    "11620": "관악구", "11650": "서초구", "11680": "강남구", "11710": "송파구",
    "11740": "강동구",
}


# CSV 인코딩이 달라도 읽을 수 있도록 여러 인코딩을 순서대로 시도함
def read_csv_flexible(path: Path) -> pd.DataFrame:
    # 대상 데이터를 하나씩 순회하면서 각 항목에 동일한 처리 규칙을 적용함.
    for encoding in ["utf-8-sig", "utf-8", "cp949", "euc-kr"]:
        try:
            return pd.read_csv(path, encoding=encoding, low_memory=False)
        except UnicodeDecodeError:
            pass
    raise RuntimeError(f"CSV 인코딩을 읽을 수 없습니다: {path}")


# 배포 버전에 따라 달라질 수 있는 후보 컬럼명 중 실제 존재하는 컬럼을 찾음
def pick_column(df: pd.DataFrame, candidates: list[str]) -> str:
    normalized = {str(c).strip().lower(): c for c in df.columns}
    # 대상 데이터를 하나씩 순회하면서 각 항목에 동일한 처리 규칙을 적용함.
    for candidate in candidates:
        key = candidate.strip().lower()
        if key in normalized:
            return normalized[key]
    raise KeyError(
        f"필요 컬럼을 찾지 못했습니다. 후보={candidates}, 실제={list(df.columns)}"
    )


# 주소 문자열에서 서울 자치구 이름을 추출함
def extract_district(address: str) -> str | None:
    match = re.search(r"서울(?:특별시)?\s+([가-힣]+구)", str(address))
    # 계산이 끝난 결과를 호출한 쪽에서 이어서 사용할 수 있도록 반환함.
    return match.group(1) if match else None