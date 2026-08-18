# 동네 군집·키워드 결과 조회 처리

# 이 파일에서 사용할 표준/외부 모듈과 프로젝트 내부 기능 불러옴
from __future__ import annotations

from app.services.artifact_store import neighborhood_clusters, neighborhood_keywords


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
    }