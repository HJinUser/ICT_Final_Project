# 학습 모델·CSV·JSON 결과를 로딩하고 캐시

# 이 파일에서 사용할 표준/외부 모듈과 프로젝트 내부 기능 불러옴
from __future__ import annotations

import json
from functools import lru_cache

import joblib
import pandas as pd

from app.config import MODELS_DIR, OUTPUTS_DIR, PROCESSED_DIR


# 저장된 매매 시세예측 Pipeline을 최초 1회 로딩해 캐시하는 함수임
@lru_cache(maxsize=1)
def sale_model():
    # 저장된 매매 학습 Pipeline을 joblib로 불러와 반환함
    return joblib.load(MODELS_DIR / "sale_price_pipeline.joblib")


# 저장된 전세 시세예측 Pipeline을 최초 1회 로딩해 캐시하는 함수임
@lru_cache(maxsize=1)
def jeonse_model():
    # 저장된 전세 학습 Pipeline을 joblib로 불러와 반환함
    return joblib.load(MODELS_DIR / "jeonse_price_pipeline.joblib")


# 저장된 월세 다중출력 Pipeline을 최초 1회 로딩해 캐시하는 함수임
@lru_cache(maxsize=1)
def monthly_model():
    # 저장된 월세 다중출력 학습 Pipeline을 joblib로 불러와 반환함
    return joblib.load(MODELS_DIR / "monthly_price_pipeline.joblib")


# 가격모델 버전과 성능정보가 담긴 metadata JSON을 읽어 캐시하는 함수임
@lru_cache(maxsize=1)
def price_metadata() -> dict:
    # 파일을 안전하게 열고 블록이 끝나면 자동으로 닫히도록 처리함.
    with open(MODELS_DIR / "price_metadata.json", encoding="utf-8") as f:
        # 계산/조회가 끝난 최종 결과를 호출한 쪽에 반환함
        return json.load(f)


# 가격예측에 사용하는 자치구 Feature CSV를 읽어 캐시하는 함수임
@lru_cache(maxsize=1)
def district_features() -> pd.DataFrame:
    # 가격예측용 자치구 Feature CSV를 DataFrame으로 읽어 반환함
    return pd.read_csv(PROCESSED_DIR / "district_features.csv")


# 동네 분석에 사용하는 행정동 Feature CSV를 읽어 캐시하는 함수임
@lru_cache(maxsize=1)
def neighborhood_features() -> pd.DataFrame:
    # 동네분석용 행정동 Feature CSV를 DataFrame으로 읽어 반환함
    return pd.read_csv(PROCESSED_DIR / "neighborhood_features.csv")


# K-Means 결과 CSV를 읽어 캐시하는 함수임
@lru_cache(maxsize=1)
def neighborhood_clusters() -> pd.DataFrame:
    # K-Means 동네 군집 결과 CSV를 DataFrame으로 읽어 반환함
    return pd.read_csv(OUTPUTS_DIR / "neighborhood_clusters.csv")


# 군집 개수·실루엣 점수 등이 담긴 JSON을 읽어 캐시하는 함수임
@lru_cache(maxsize=1)
def cluster_metadata() -> dict:
    # 파일을 안전하게 열고 블록이 끝나면 자동으로 닫히도록 처리함.
    with open(OUTPUTS_DIR / "cluster_profiles.json", encoding="utf-8") as f:
        # 계산/조회가 끝난 최종 결과를 호출한 쪽에 반환함
        return json.load(f)


# 동네 키워드 분석 결과 JSON을 읽고 없으면 빈 기본값을 반환하는 함수임
@lru_cache(maxsize=1)
def neighborhood_keywords() -> dict:
    path = OUTPUTS_DIR / "neighborhood_keywords.json"
    # 필수 조건이나 데이터가 없는 경우를 먼저 확인함
    if not path.exists():
        # 계산/조회가 끝난 최종 결과를 호출한 쪽에 반환함
        return {
            "analyzed_at": None,
            "document_count": 0,
            "neighborhood_count": 0,
            "neighborhoods": {},
        }
    # 파일을 안전하게 열고 블록이 끝나면 자동으로 닫히도록 처리함.
    with open(path, encoding="utf-8") as f:
        # 계산/조회가 끝난 최종 결과를 호출한 쪽에 반환함
        return json.load(f)