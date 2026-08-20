# 동네 군집·키워드 결과 조회 처리

# 이 파일에서 사용할 표준/외부 모듈과 프로젝트 내부 기능 불러옴
from __future__ import annotations

from functools import lru_cache

import pandas as pd

from app.config import PROCESSED_DIR
from app.services.admin_dong_service import get_boundary
from app.services.artifact_store import neighborhood_clusters, neighborhood_keywords

# 19-6 merge_neighborhood_reviews.py가 만든 한줄평 corpus임.
# 설문으로 받은 응답이 행정동(admin_code)까지 붙은 상태로 들어 있다.
REVIEW_PATH = PROCESSED_DIR / "neighborhood_reviews.csv"

# 한 동네에 설문 응답이 많아도 화면에는 이만큼만 보여 준다
SURVEY_REVIEW_LIMIT = 20


# 설문 한줄평을 행정동별로 묶어 한 번만 읽어 두는 함수임
@lru_cache(maxsize=1)
def _survey_reviews() -> dict[str, list[str]]:
    # 이 파일은 텍스트마이닝 산출물이라 없을 수 있다. 없으면 설문 한줄평만 비우고 나머지는 그대로 동작시킨다.
    try:
        frame = pd.read_csv(REVIEW_PATH, encoding="utf-8-sig")
    except FileNotFoundError:
        # 계산/조회가 끝난 최종 결과를 호출한 쪽에 반환함
        return {}

    grouped: dict[str, list[str]] = {}

    # 대상 데이터를 하나씩 순회하면서 같은 처리 반복함
    for code, part in frame.groupby("admin_code"):
        texts = [str(text).strip() for text in part["text"].tolist() if str(text).strip()]
        grouped[str(code)] = texts[:SURVEY_REVIEW_LIMIT]

    # 계산/조회가 끝난 최종 결과를 호출한 쪽에 반환함
    return grouped


# 행정동 코드로 군집정보와 키워드 결과를 합쳐 반환하는 함수임
def find_neighborhood(admin_code: str) -> dict | None:
    cluster = neighborhood_clusters()
    found = cluster[cluster["admin_code"].astype(str).eq(str(admin_code))]
    # 조회/필터 결과가 비어 있는 경우를 먼저 처리함
    if found.empty:
        # 계산/조회가 끝난 최종 결과를 호출한 쪽에 반환함
        return None

    row = found.iloc[0]
    # 19-7에서 키워드 JSON의 키를 admin_code로 바꿨으므로 admin_name이 아니라 admin_code로 조회함
    keywords = neighborhood_keywords().get("neighborhoods", {}).get(str(row["admin_code"]), {})

    # 계산/조회가 끝난 최종 결과를 호출한 쪽에 반환함
    return {
        "adminCode": str(row["admin_code"]),
        "adminName": str(row["admin_name"]),
        "districtName": str(row["district_name"]),
        "clusterId": int(row["cluster_id"]),
        "clusterName": str(row["cluster_name"]),
        "keywords": keywords.get("keywords", []),
        "reviewDocumentCount": int(keywords.get("document_count", 0)),
        # 지도에 그릴 행정동 경계. (위도, 경도) 순서이고 소수 5자리로 줄여 보낸다.
        "boundary": get_boundary(str(row["admin_code"])) or [],
        # 설문으로 받은 한줄평. 사용자가 서비스에서 쓴 한줄평과는 별개이고 읽기 전용이다.
        # DB에 넣지 않는 이유: 작성자가 없고, 넣으면 48-8 재분석에서 설문이 두 번 계산된다.
        "surveyReviews": _survey_reviews().get(str(row["admin_code"]), []),
    }