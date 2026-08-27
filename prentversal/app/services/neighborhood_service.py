# 동네 군집·키워드 결과 조회 처리

# 이 파일에서 사용할 표준/외부 모듈과 프로젝트 내부 기능 불러옴
from __future__ import annotations

import json
from functools import lru_cache

import pandas as pd

from app.config import OUTPUTS_DIR, PROCESSED_DIR
from app.services.admin_dong_service import get_boundary
from app.services.artifact_store import neighborhood_clusters, neighborhood_keywords

# 21-1 suggest_neighborhood_tags.py 가 만든 태그 추천 결과임.
# 한줄평 키워드를 Spring tags 테이블의 태그 이름으로 옮긴 것이고, 관리자가 검토해서 붙인다.
TAG_SUGGESTION_PATH = OUTPUTS_DIR / "neighborhood_tag_suggestions.json"

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


# 한줄평에서 뽑은 태그 추천 결과를 한 번만 읽어 두는 함수임
@lru_cache(maxsize=1)
def _tag_suggestions() -> dict:
    # 이 파일은 21-1 분석 산출물이라 없을 수 있다. 없으면 추천을 비우고 나머지는 그대로 동작시킨다.
    try:
        with open(TAG_SUGGESTION_PATH, encoding="utf-8") as f:
            # 계산/조회가 끝난 최종 결과를 호출한 쪽에 반환함
            return json.load(f)
    except FileNotFoundError:
        # 계산/조회가 끝난 최종 결과를 호출한 쪽에 반환함
        return {
            "analyzed_at": None,
            "neighborhood_count": 0,
            "suggestion_count": 0,
            "neighborhoods": {},
        }


# 행정동별 태그 추천 결과 전체를 반환하는 함수임.
# Spring이 등록된 동네마다 따로 묻지 않고 한 번에 받아 두고 admin_code로 찾아 쓴다.
def find_tag_suggestions() -> dict:
    # 계산/조회가 끝난 최종 결과를 호출한 쪽에 반환함
    return _tag_suggestions()


# 동네 카드에 몇 개까지 보여 줄지. 카드 폭이 좁아 더 넣으면 줄이 넘어간다.
CARD_KEYWORD_LIMIT = 5

"""
동네 유형(K-Means 군집)별로 그 유형의 성격을 나타내는 태그.

태그가 실제로 어느 군집에 몰리는지 세어 봤지만 그렇게 나누지 않았다.
'지하철역 도보 5분'이 39%/3%/57%, '젊은층 선호'가 42%/15%/42%로 흩어지고 표본도 대부분 1~2개라,
빈도로 나누면 근거 없는 분류가 된다. 대신 각 군집을 정의하는 생활지표를 기준으로 배분했다.
(outputs/cluster_profiles.json 의 점수 기준)

    녹지, 교통 중심형     green 2.36, transport 0.70  -> 녹지와 교통
    생활편의, 의료 중심형  living 0.76, medical 0.63, education 0.50, transport 0.45 -> 생활, 의료, 교육
    한적한 주거형       전 지표가 평균 이하 -> 인프라가 두드러지지 않은 저밀도 주거지

여기에 없는 태그는 화면에 나오지 않는다. 엘리베이터·풀옵션·남향·주차 가능처럼
집 한 채의 속성이라 동네를 고르는 기준이 될 수 없는 태그를 빼기 위해서다.

Key 는 군집 이름이라 모델을 다시 학습해 이름이 바뀌면 함께 고쳐야 한다.
아래 validate_cluster_tag_groups() 가 군집 결과와 대조해 어긋나면 알려 준다.
"""
CLUSTER_TAG_GROUPS: dict[str, list[str]] = {
    "녹지, 교통 중심형": [
        "공원 인근",
        "한강뷰",
        "지하철역 도보 5분",
        "버스정류장 인근",
    ],
    "생활편의, 의료 중심형": [
        "마트 근처",
        "편의점 근처",
        "세탁소 근처",
        "병원 근처",
        "학원가",
        "교육열 높음",
        "젊은층 선호",
    ],
    "한적한 주거형": [
        "조용한 분위기",
        "노년층 선호",
        "높은 치안",
        "냄새 적음",
        "저렴한 가격",
    ],
}


# 배분표의 군집 이름이 실제 K-Means 결과와 맞는지 확인해 어긋난 이름을 돌려주는 함수임
def validate_cluster_tag_groups() -> dict[str, list[str]]:
    actual = set(neighborhood_clusters()["cluster_name"].astype(str).unique())
    mapped = set(CLUSTER_TAG_GROUPS)

    # 계산/조회가 끝난 최종 결과를 호출한 쪽에 반환함
    return {
        "missing": sorted(actual - mapped),
        "unknown": sorted(mapped - actual),
    }


# 동네 유형별 태그 배분표를 반환하는 함수임. 화면의 태그 필터가 이 묶음대로 칩을 그린다.
def find_cluster_tag_groups() -> dict:
    check = validate_cluster_tag_groups()

    # 군집 이름이 바뀌었는데 배분표를 안 고치면 그 유형의 칩이 통째로 사라진다.
    # 조용히 비우지 않고 어긋난 이름을 함께 실어 보내 화면/로그에서 드러나게 한다.
    # 계산/조회가 끝난 최종 결과를 호출한 쪽에 반환함
    return {
        "groups": CLUSTER_TAG_GROUPS,
        "missingClusterNames": check["missing"],
        "unknownClusterNames": check["unknown"],
    }


# 서울 전체 행정동 목록에 군집명을 붙여 반환하는 함수임. 동네 탐색이 전체 목록을 한 번에 그릴 때 쓴다.
def find_all_neighborhoods() -> list[dict]:
    cluster = neighborhood_clusters()
    keywords = neighborhood_keywords().get("neighborhoods", {})
    suggestions = _tag_suggestions().get("neighborhoods", {})

    result: list[dict] = []
    # 대상 데이터를 하나씩 순회하면서 같은 처리 반복함
    for _, row in cluster.iterrows():
        admin_code = str(row["admin_code"])
        keyword_entry = keywords.get(admin_code, {})

        # 관리자가 등록한 동네는 425개 중 7개뿐이라 나머지 카드에는 붙일 태그가 없다.
        # 그 자리를 한줄평에서 뽑은 키워드로 채운다. 확정된 태그가 아니라 분석 결과라서
        # 화면에서도 태그와 구분해 보여 준다.
        card_keywords = [
            str(item["keyword"])
            for item in keyword_entry.get("keywords", [])[:CARD_KEYWORD_LIMIT]
        ]

        # 한줄평에서 뽑은 태그 후보 이름. 관리자가 아직 확정하지 않은 값이라 화면에서는
        # 확정 태그와 구분해서 쓰지만, 태그 필터에서는 함께 걸리게 한다.
        # 확정 태그는 등록된 동네 7곳에만 붙어서 이것 없이는 필터가 사실상 동작하지 않는다.
        suggested_tag_names = [
            str(item["tagName"])
            for item in suggestions.get(admin_code, {}).get("suggestions", [])
        ]

        result.append({
            "adminCode": admin_code,
            "adminName": str(row["admin_name"]),
            "districtName": str(row["district_name"]),
            "clusterId": int(row["cluster_id"]),
            "clusterName": str(row["cluster_name"]),
            "keywords": card_keywords,
            "suggestedTagNames": suggested_tag_names,
            "reviewDocumentCount": int(keyword_entry.get("document_count", 0)),
        })

    # 계산/조회가 끝난 최종 결과를 호출한 쪽에 반환함
    return result


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