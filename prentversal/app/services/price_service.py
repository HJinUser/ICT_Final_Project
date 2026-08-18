# SALE/JEONSE/MONTHLY 시세 예측 처리

# 이 파일에서 사용할 표준/외부 모듈과 프로젝트 내부 기능 불러옴
from __future__ import annotations

import pandas as pd

from app.schemas.price import PricePredictRequest
from app.services.artifact_store import (
    district_features,
    jeonse_model,
    monthly_model,
    price_metadata,
    sale_model,
)
# 이 파일에서 사용할 표준/외부 모듈과 프로젝트 내부 기능 불러옴
from app.services.feature_service import get_nearby_features

# 여러 처리에서 공통으로 사용할 설정값을 상수로 미리 정의함.
FEATURES = [
    "property_type",
    "district_name",
    "area",
    "floor",
    "build_year",
    "station_density",
    "bus_stop_density",
    "hospital_density",
    "mart_density",
    "convenience_density",
    "laundry_density",
    "school_density",
    "academy_density",
    "academy_official_density",
    "park_density",
    "park_area_ratio",
]


# 요청한 자치구의 공간 Feature 한 행을 찾아 반환하는 함수임
def _district_row(name: str) -> pd.Series:
    df = district_features()
    found = df[df["district_name"].eq(name)]
    # 조회/필터 결과가 비어 있는 경우를 먼저 처리함
    if found.empty:
        # 잘못된 상태에서 계속 진행하지 않도록 명시적으로 예외 발생시킴
        raise ValueError(f"지원하지 않는 서울 자치구입니다: {name}")
    # 계산/조회가 끝난 최종 결과를 호출한 쪽에 반환함
    return found.iloc[0]


# FastAPI 요청값과 자치구 Feature를 모델 입력 컬럼 순서에 맞는 1행 DataFrame으로 만드는 함수임
def _feature_frame(request: PricePredictRequest) -> pd.DataFrame:
    d = _district_row(request.districtName)

    row = {
        "property_type": request.propertyType,
        "district_name": request.districtName,
        "area": request.area,
        "floor": request.floor,
        "build_year": request.buildYear,
        "station_density": d["station_density"],
        "bus_stop_density": d["bus_stop_density"],
        "hospital_density": d["hospital_density"],
        "mart_density": d["mart_density"],
        "convenience_density": d["convenience_density"],
        "laundry_density": d["laundry_density"],
        "school_density": d["school_density"],
        "academy_density": d["academy_density"],
        "academy_official_density": d["academy_official_density"],
        "park_density": d["park_density"],
        "park_area_ratio": d["park_area_ratio"],
    }
    # 시세예측 입력값을 학습 때와 같은 Feature 순서의 1행 DataFrame으로 만들어 반환함
    return pd.DataFrame([row], columns=FEATURES)


# 모델 예측 금액을 0 이상 정수 만원 단위로 정리하는 함수임
def _money(value: float) -> int:
    # 계산/조회가 끝난 최종 결과를 호출한 쪽에 반환함
    return max(0, int(round(float(value))))


# 거래유형에 맞는 학습 모델을 실행하고 AI 가격과 주변시설 정보를 묶어 반환하는 핵심 함수임
def predict_price(request: PricePredictRequest) -> dict:
    x = _feature_frame(request)
    deal_type = request.dealType.upper()

    response = {
        "aiPrice": None,
        "aiDeposit": None,
        "aiMonthlyDeposit": None,
        "aiMonthlyRent": None,
    }

    # 현재 값이나 상태가 해당 조건에 맞는지 확인한 뒤 필요한 분기 처리를 수행함.
    if deal_type == "SALE":
        # 학습된 모델에 입력 Feature를 넣어 예측값 생성함
        response["aiPrice"] = _money(sale_model().predict(x)[0])
    elif deal_type == "JEONSE":
        # 학습된 모델에 입력 Feature를 넣어 예측값 생성함
        response["aiDeposit"] = _money(jeonse_model().predict(x)[0])
    # 현재 값이나 상태가 해당 조건에 맞는지 확인한 뒤 필요한 분기 처리를 수행함.
    elif deal_type == "MONTHLY":
        # 학습된 모델에 입력 Feature를 넣어 예측값 생성함
        prediction = monthly_model().predict(x)[0]
        response["aiMonthlyDeposit"] = _money(prediction[0])
        response["aiMonthlyRent"] = _money(prediction[1])
    else:
        # 잘못된 상태에서 계속 진행하지 않도록 명시적으로 예외 발생시킴
        raise ValueError(f"지원하지 않는 거래유형입니다: {request.dealType}")

    nearby = get_nearby_features(request.latitude, request.longitude)
    response["stationDistance"] = nearby["nearest_station_distance_m"]
    response["nearby"] = nearby
    response["modelVersion"] = price_metadata()["version"]
    # 계산/조회가 끝난 최종 결과를 호출한 쪽에 반환함
    return response