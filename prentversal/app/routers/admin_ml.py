# 관리자 ML 상태 조회 API 엔드포인트

# 이 파일에서 사용할 표준/외부 모듈과 프로젝트 내부 기능 불러옴
from fastapi import APIRouter

from app.services.artifact_store import (
    cluster_metadata,
    neighborhood_keywords,
    price_metadata,
)

# 이 기능의 공통 URL prefix와 문서 태그를 FastAPI Router에 설정함.
router = APIRouter(prefix="/ml/admin", tags=["ML Admin"])


# 학습모델·군집·텍스트마이닝의 현재 메타데이터를 관리자 화면용으로 반환하는 함수임
@router.get("/status")
def status():
    price = price_metadata()
    cluster = cluster_metadata()
    text = neighborhood_keywords()

    # 계산/조회가 끝난 최종 결과를 호출한 쪽에 반환함
    return {
        "price": price,
        "clustering": {
            "analyzedAt": cluster.get("analyzed_at"),
            "neighborhoodCount": cluster.get("neighborhood_count", 0),
            "selectedK": cluster.get("selected_k"),
            "silhouetteScores": cluster.get("silhouette_scores", {}),
        },
        "textMining": {
            "analyzedAt": text.get("analyzed_at"),
            "documentCount": text.get("document_count", 0),
            "neighborhoodCount": text.get("neighborhood_count", 0),
        },
    }