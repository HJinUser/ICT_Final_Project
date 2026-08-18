# 이 파일에서 사용할 표준/외부 모듈과 프로젝트 내부 기능 불러옴
from __future__ import annotations

import math
from collections import defaultdict
from datetime import datetime

import numpy as np

from app.schemas.recommendation import (
    PropertyCandidate,
    RecommendationRequest,
    RecentSearchPayload,
    UserPreferencePayload,
)
# 이 파일에서 사용할 표준/외부 모듈과 프로젝트 내부 기능 불러옴
from app.services.artifact_store import neighborhood_clusters, neighborhood_features
from app.services.feature_service import get_nearby_features

# 입력·출력 파일 위치를 한 곳에서 재사용할 수 있도록 경로를 미리 정의함.
DIRECT_WEIGHTS = {
    "property_type": 7,
    "area": 6,
    "rooms": 4,
    "new_build": 5,
    "station": 6,
    "education": 4,
    "park": 3,
    "hospital": 2,
    "convenience": 3,
    "bus": 2,
    "tags": 12,
    "maintenance": 3,
}

# 여러 처리에서 공통으로 사용할 설정값을 상수로 미리 정의함.
BEHAVIOR_WEIGHTS = {
    "feedback": 14,
    "favorite": 6,
    "best": 13,
}

# 여러 처리에서 공통으로 사용할 설정값을 상수로 미리 정의함.
RECENT_WEIGHTS = {
    "district": 4,
    "deal": 2,
    "price": 2,
    "property_type": 2,
}


# 계산값을 추천 점수용 0~1 범위 안으로 제한하는 함수임
def clamp01(value: float) -> float:
    # 계산/조회가 끝난 최종 결과를 호출한 쪽에 반환함
    return max(0.0, min(1.0, float(value)))


# 값이 사용자의 희망 최소·최대 범위에 얼마나 가까운지 0~1 점수로 계산하는 함수임
def range_score(value: float, minimum: float | None, maximum: float | None) -> float | None:
    # 현재 값이나 상태가 해당 조건에 맞는지 확인한 뒤 필요한 분기 처리를 수행함.
    if minimum is None and maximum is None:
        # 계산/조회가 끝난 최종 결과를 호출한 쪽에 반환함
        return None

    # 현재 값이나 상태가 해당 조건에 맞는지 확인한 뒤 필요한 분기 처리를 수행함.
    if minimum is not None and value < minimum:
        gap = minimum - value
        tolerance = max(minimum * 0.5, 1.0)
        # 계산/조회가 끝난 최종 결과를 호출한 쪽에 반환함
        return clamp01(1 - gap / tolerance)

    # 현재 값이나 상태가 해당 조건에 맞는지 확인한 뒤 필요한 분기 처리를 수행함.
    if maximum is not None and value > maximum:
        gap = value - maximum
        tolerance = max(maximum * 0.5, 1.0)
        # 계산/조회가 끝난 최종 결과를 호출한 쪽에 반환함
        return clamp01(1 - gap / tolerance)

    # 계산/조회가 끝난 최종 결과를 호출한 쪽에 반환함
    return 1.0


# 시설 개수처럼 상한이 있는 값을 0~1 점수로 변환하는 함수임
def cap_score(value: float, full_score_at: float) -> float:
    # 현재 값이나 상태가 해당 조건에 맞는지 확인한 뒤 필요한 분기 처리를 수행함.
    if full_score_at <= 0:
        # 계산/조회가 끝난 최종 결과를 호출한 쪽에 반환함
        return 0.0
    # 계산/조회가 끝난 최종 결과를 호출한 쪽에 반환함
    return clamp01(value / full_score_at)


# 거래유형별 후보 매물의 대표 가격값을 하나 골라 반환하는 함수임
def candidate_primary_price(p: PropertyCandidate) -> float | None:
    # 현재 값이나 상태가 해당 조건에 맞는지 확인한 뒤 필요한 분기 처리를 수행함.
    if p.dealType == "SALE":
        # 계산/조회가 끝난 최종 결과를 호출한 쪽에 반환함
        return float(p.price) if p.price is not None else None
    if p.dealType == "JEONSE":
        # 계산/조회가 끝난 최종 결과를 호출한 쪽에 반환함
        return float(p.deposit) if p.deposit is not None else None
    # 현재 값이나 상태가 해당 조건에 맞는지 확인한 뒤 필요한 분기 처리를 수행함.
    if p.dealType == "MONTHLY":
        # 최근검색의 단일 가격대 비교에는 월세를 대표값으로 사용함
        return float(p.monthlyRent) if p.monthlyRent is not None else None
    # 계산/조회가 끝난 최종 결과를 호출한 쪽에 반환함
    return None


# 후보 매물이 사용자의 예산 범위를 얼마나 벗어나는지 감점 배수로 계산하는 함수임
def budget_factor(p: PropertyCandidate, pref: UserPreferencePayload) -> float:
    # 현재 값이나 상태가 해당 조건에 맞는지 확인한 뒤 필요한 분기 처리를 수행함.
    if p.dealType == "SALE":
        value, low, high = p.price, pref.saleMinPrice, pref.saleMaxPrice
    elif p.dealType == "JEONSE":
        value, low, high = p.deposit, pref.jeonseMinDeposit, pref.jeonseMaxDeposit
    else:
        # 월세는 보증금과 월세 중 더 나쁜 쪽의 factor를 사용함
        factors = []
        # 현재 값이나 상태가 해당 조건에 맞는지 확인한 뒤 필요한 분기 처리를 수행함.
        if p.monthlyDeposit is not None:
            factors.append(_budget_one(
                p.monthlyDeposit,
                pref.monthlyMinDeposit,
                pref.monthlyMaxDeposit,
            ))
        # 현재 값이나 상태가 해당 조건에 맞는지 확인한 뒤 필요한 분기 처리를 수행함.
        if p.monthlyRent is not None:
            factors.append(_budget_one(
                p.monthlyRent,
                pref.monthlyMinRent,
                pref.monthlyMaxRent,
            ))
        # 계산/조회가 끝난 최종 결과를 호출한 쪽에 반환함
        return min(factors) if factors else 1.0

    # 계산/조회가 끝난 최종 결과를 호출한 쪽에 반환함
    return _budget_one(value, low, high)


# 단일 가격값에 대해 예산 초과 정도를 0~1 감점 배수로 계산하는 함수임
def _budget_one(value: int | None, low: int | None, high: int | None) -> float:
    # 현재 값이나 상태가 해당 조건에 맞는지 확인한 뒤 필요한 분기 처리를 수행함.
    if value is None or (low is None and high is None):
        # 계산/조회가 끝난 최종 결과를 호출한 쪽에 반환함
        return 1.0
    if low is not None and value < low:
        # 더 저렴한 것은 강하게 벌점 주지 않음
        return 0.95
    # 현재 값이나 상태가 해당 조건에 맞는지 확인한 뒤 필요한 분기 처리를 수행함.
    if high is None or value <= high:
        # 계산/조회가 끝난 최종 결과를 호출한 쪽에 반환함
        return 1.0

    ratio = (value - high) / max(high, 1)
    # 현재 값이나 상태가 해당 조건에 맞는지 확인한 뒤 필요한 분기 처리를 수행함.
    if ratio >= 0.5:
        # 계산/조회가 끝난 최종 결과를 호출한 쪽에 반환함
        return 0.40
    if ratio >= 0.2:
        # 계산/조회가 끝난 최종 결과를 호출한 쪽에 반환함
        return 0.70 - (ratio - 0.2) * 1.0
    # 계산/조회가 끝난 최종 결과를 호출한 쪽에 반환함
    return 1.0 - ratio * 1.5


# 선택된 항목만 사용해 가중평균 점수를 다시 정규화하는 함수임
def weighted_available_score(parts: dict[str, float | None], weights: dict[str, int]) -> float:
    available = [(key, value) for key, value in parts.items() if value is not None]
    # 필수 조건이나 데이터가 없는 경우를 먼저 확인함
    if not available:
        # 계산/조회가 끝난 최종 결과를 호출한 쪽에 반환함
        return 0.5

    denominator = sum(weights[key] for key, _ in available)
    # 현재 값이나 상태가 해당 조건에 맞는지 확인한 뒤 필요한 분기 처리를 수행함.
    if denominator == 0:
        # 계산/조회가 끝난 최종 결과를 호출한 쪽에 반환함
        return 0.5
    numerator = sum(weights[key] * clamp01(value) for key, value in available)
    # 계산/조회가 끝난 최종 결과를 호출한 쪽에 반환함
    return numerator / denominator


# 사용자가 직접 설정한 취향과 후보 매물의 일치도를 계산하는 함수임
def direct_score(
    p: PropertyCandidate,
    pref: UserPreferencePayload,
    nearby: dict,
) -> tuple[float, list[tuple[str, float]]]:
    current_year = datetime.now().year

    type_score = None
    # 현재 값이나 상태가 해당 조건에 맞는지 확인한 뒤 필요한 분기 처리를 수행함.
    if pref.propertyTypes:
        type_score = 1.0 if p.propertyType in pref.propertyTypes else 0.0

    area_score = range_score(p.area, pref.minArea, pref.maxArea)

    rooms_score = None
    # 현재 값이나 상태가 해당 조건에 맞는지 확인한 뒤 필요한 분기 처리를 수행함.
    if pref.minRoomCount is not None:
        rooms = p.roomCount or 0
        rooms_score = 1.0 if rooms >= pref.minRoomCount else clamp01(rooms / max(pref.minRoomCount, 1))

    new_build_score = None
    # 현재 값이나 상태가 해당 조건에 맞는지 확인한 뒤 필요한 분기 처리를 수행함.
    if pref.newBuildPreferred:
        new_build_score = (
            1.0
            if p.buildYear is not None and current_year - p.buildYear <= 5
            else 0.0
        )

    station_score = None
    # 현재 값이나 상태가 해당 조건에 맞는지 확인한 뒤 필요한 분기 처리를 수행함.
    if pref.stationPreferred:
        distance = nearby["nearest_station_distance_m"]
        if distance <= 500:
            station_score = 1.0
        # 현재 값이나 상태가 해당 조건에 맞는지 확인한 뒤 필요한 분기 처리를 수행함.
        elif distance >= 1500:
            station_score = 0.0
        else:
            station_score = 1 - ((distance - 500) / 1000)

    education_score = None
    # 현재 값이나 상태가 해당 조건에 맞는지 확인한 뒤 필요한 분기 처리를 수행함.
    if pref.educationPreferred:
        education_score = (
            cap_score(nearby["school_count_1000m"], 5) * 0.45
            + cap_score(nearby["academy_count_1000m"], 20) * 0.55
        )

    park_score = cap_score(nearby["park_count_1000m"], 3) if pref.parkPreferred else None
    hospital_score = cap_score(nearby["hospital_count_1000m"], 5) if pref.hospitalPreferred else None

    convenience_score = None
    # 현재 값이나 상태가 해당 조건에 맞는지 확인한 뒤 필요한 분기 처리를 수행함.
    if pref.conveniencePreferred:
        convenience_score = (
            cap_score(nearby["mart_count_1000m"], 3) * 0.5
            + cap_score(nearby["convenience_count_500m"], 5) * 0.5
        )

    bus_score = cap_score(nearby["bus_count_500m"], 8) if pref.busPreferred else None

    tag_score = None
    # 현재 값이나 상태가 해당 조건에 맞는지 확인한 뒤 필요한 분기 처리를 수행함.
    if pref.preferredTags:
        preferred = set(pref.preferredTags)
        actual = set(p.tags)
        tag_score = len(preferred & actual) / len(preferred)

    maintenance_score = None
    # 현재 값이나 상태가 해당 조건에 맞는지 확인한 뒤 필요한 분기 처리를 수행함.
    if pref.lowMaintenancePreferred:
        fee = max(p.maintenanceFee or 0, 0)
        # Property.maintenanceFee 단위는 만원이다. 30만원 이상이면 0점, 0이면 1점인 v1 기준
        maintenance_score = clamp01(1 - fee / 30)

    parts = {
        "property_type": type_score,
        "area": area_score,
        "rooms": rooms_score,
        "new_build": new_build_score,
        "station": station_score,
        "education": education_score,
        "park": park_score,
        "hospital": hospital_score,
        "convenience": convenience_score,
        "bus": bus_score,
        "tags": tag_score,
        "maintenance": maintenance_score,
    }

    score = weighted_available_score(parts, DIRECT_WEIGHTS)
    ranked = sorted(
        [(k, v) for k, v in parts.items() if v is not None],
        key=lambda x: x[1] * DIRECT_WEIGHTS[x[0]],
        reverse=True,
    )
    # 계산/조회가 끝난 최종 결과를 호출한 쪽에 반환함
    return score, ranked


# 매물 속성과 주변시설을 Cosine Similarity 계산용 벡터 사전으로 만드는 함수임
def property_vector(p: PropertyCandidate, nearby: dict) -> dict[str, float]:
    vector: dict[str, float] = {}

    vector[f"propertyType:{p.propertyType}"] = 1.0
    vector[f"dealType:{p.dealType}"] = 1.0
    vector[f"district:{p.districtName}"] = 1.0

    vector["area"] = min(p.area / 150.0, 2.0)
    vector["rooms"] = min((p.roomCount or 0) / 5.0, 1.5)
    vector["new_build"] = 1.0 if p.buildYear and datetime.now().year - p.buildYear <= 5 else 0.0
    vector["station"] = clamp01(1 - nearby["nearest_station_distance_m"] / 1500)
    vector["education"] = clamp01(
        nearby["school_count_1000m"] / 5 * 0.45
        + nearby["academy_count_1000m"] / 20 * 0.55
    )
    vector["park"] = cap_score(nearby["park_count_1000m"], 3)
    vector["hospital"] = cap_score(nearby["hospital_count_1000m"], 5)
    vector["convenience"] = clamp01(
        nearby["mart_count_1000m"] / 3 * 0.5
        + nearby["convenience_count_500m"] / 5 * 0.5
    )
    vector["bus"] = cap_score(nearby["bus_count_500m"], 8)

    # 대상 데이터를 하나씩 순회하면서 같은 처리 반복함
    for tag in p.tags:
        vector[f"tag:{tag}"] = 1.0

    # 계산/조회가 끝난 최종 결과를 호출한 쪽에 반환함
    return vector


# 두 sparse 사전 벡터의 Cosine Similarity를 계산하는 함수임
def cosine_dict(a: dict[str, float], b: dict[str, float]) -> float:
    keys = set(a) | set(b)
    # 필수 조건이나 데이터가 없는 경우를 먼저 확인함
    if not keys:
        # 계산/조회가 끝난 최종 결과를 호출한 쪽에 반환함
        return 0.0

    dot = sum(a.get(k, 0.0) * b.get(k, 0.0) for k in keys)
    norm_a = math.sqrt(sum(a.get(k, 0.0) ** 2 for k in keys))
    norm_b = math.sqrt(sum(b.get(k, 0.0) ** 2 for k in keys))
    # 현재 값이나 상태가 해당 조건에 맞는지 확인한 뒤 필요한 분기 처리를 수행함.
    if norm_a == 0 or norm_b == 0:
        # 계산/조회가 끝난 최종 결과를 호출한 쪽에 반환함
        return 0.0
    # 계산/조회가 끝난 최종 결과를 호출한 쪽에 반환함
    return clamp01(dot / (norm_a * norm_b))


# 여러 매물 벡터의 항목별 평균 벡터를 만드는 함수임
def mean_vector(vectors: list[dict[str, float]]) -> dict[str, float]:
    # 필수 조건이나 데이터가 없는 경우를 먼저 확인함
    if not vectors:
        # 계산/조회가 끝난 최종 결과를 호출한 쪽에 반환함
        return {}
    sums: dict[str, float] = defaultdict(float)
    # 대상 데이터를 하나씩 순회하면서 같은 처리 반복함
    for vector in vectors:
        # 대상 데이터를 하나씩 순회하면서 같은 처리 반복함
        for key, value in vector.items():
            sums[key] += value
    # 계산/조회가 끝난 최종 결과를 호출한 쪽에 반환함
    return {key: value / len(vectors) for key, value in sums.items()}


# 좋아요 평균에서 싫어요 신호를 빼 사용자의 행동 취향 벡터를 만드는 함수임
def feedback_profile(
    liked: list[dict[str, float]],
    disliked: list[dict[str, float]],
) -> dict[str, float]:
    positive = mean_vector(liked)
    negative = mean_vector(disliked)
    keys = set(positive) | set(negative)
    # Rocchio와 비슷하게 긍정 중심에서 부정 신호를 0.7배 뺌
    return {key: positive.get(key, 0.0) - 0.7 * negative.get(key, 0.0) for key in keys}


# 좋아요·싫어요·관심·BEST 행동을 조합해 후보 매물의 행동기반 점수를 계산하는 함수임
def behavior_score(
    candidate_vector: dict[str, float],
    vectors_by_id: dict[int, dict[str, float]],
    request: RecommendationRequest,
) -> float:
    liked = [vectors_by_id[x] for x in request.likedPropertyIds if x in vectors_by_id]
    disliked = [vectors_by_id[x] for x in request.dislikedPropertyIds if x in vectors_by_id]
    favorites = [vectors_by_id[x] for x in request.favoritePropertyIds if x in vectors_by_id]

    parts: dict[str, float | None] = {
        "feedback": None,
        "favorite": None,
        "best": None,
    }

    profile = feedback_profile(liked, disliked)
    # 현재 값이나 상태가 해당 조건에 맞는지 확인한 뒤 필요한 분기 처리를 수행함.
    if profile:
        parts["feedback"] = cosine_dict(candidate_vector, profile)

    favorite_vector = mean_vector(favorites)
    # 현재 값이나 상태가 해당 조건에 맞는지 확인한 뒤 필요한 분기 처리를 수행함.
    if favorite_vector:
        parts["favorite"] = cosine_dict(candidate_vector, favorite_vector)

    if request.bestPropertyId is not None and request.bestPropertyId in vectors_by_id:
        parts["best"] = cosine_dict(candidate_vector, vectors_by_id[request.bestPropertyId])

    # 계산/조회가 끝난 최종 결과를 호출한 쪽에 반환함
    return weighted_available_score(parts, BEHAVIOR_WEIGHTS)


# 후보 매물이 최근 검색의 지역·거래·유형·가격 조건과 얼마나 맞는지 계산하는 함수임
def search_match(p: PropertyCandidate, search: RecentSearchPayload) -> dict[str, float | None]:
    price = candidate_primary_price(p)
    # 계산/조회가 끝난 최종 결과를 호출한 쪽에 반환함
    return {
        "district": 1.0 if search.districtName and p.districtName == search.districtName else (0.0 if search.districtName else None),
        "deal": 1.0 if search.dealType and p.dealType == search.dealType else (0.0 if search.dealType else None),
        "property_type": 1.0 if search.propertyType and p.propertyType == search.propertyType else (0.0 if search.propertyType else None),
        "price": range_score(price, search.minPrice, search.maxPrice) if price is not None else None,
    }


# 최근 검색 여러 건에 최신순 감쇠를 적용해 후보 매물 점수를 계산하는 함수임
def recent_score(p: PropertyCandidate, searches: list[RecentSearchPayload]) -> float:
    # 필수 조건이나 데이터가 없는 경우를 먼저 확인함
    if not searches:
        # 계산/조회가 끝난 최종 결과를 호출한 쪽에 반환함
        return 0.5

    # Spring에서 최신순으로 최대 10개를 보낸다고 가정함
    numerator = 0.0
    denominator = 0.0

    # 대상 데이터를 하나씩 순회하면서 같은 처리 반복함
    for index, search in enumerate(searches[:10]):
        decay = 0.85 ** index
        parts = search_match(p, search)
        score = weighted_available_score(parts, RECENT_WEIGHTS)
        numerator += score * decay
        denominator += decay

    # 계산/조회가 끝난 최종 결과를 호출한 쪽에 반환함
    return numerator / denominator if denominator else 0.5


# 거래유형·선호지역·예산 불일치를 후보 제거 대신 감점 배수로 반영하는 함수임
def soft_consistency_factor(p: PropertyCandidate, pref: UserPreferencePayload) -> float:
    factor = 1.0

    # 현재 값이나 상태가 해당 조건에 맞는지 확인한 뒤 필요한 분기 처리를 수행함.
    if pref.dealType and p.dealType != pref.dealType:
        factor *= 0.35

    if pref.preferredDistricts and p.districtName not in pref.preferredDistricts:
        factor *= 0.80

    factor *= budget_factor(p, pref)
    # 계산/조회가 끝난 최종 결과를 호출한 쪽에 반환함
    return clamp01(factor)


# 여러 처리에서 공통으로 사용할 설정값을 상수로 미리 정의함.
REASON_NAMES = {
    "property_type": "선호 매물 유형과 일치",
    "area": "희망 면적과 잘 맞음",
    "rooms": "희망 방 개수와 잘 맞음",
    "new_build": "신축 선호와 일치",
    "station": "역 접근성이 좋음",
    "education": "학교·학원 접근성이 좋음",
    "park": "공원 접근성이 좋음",
    "hospital": "병원 접근성이 좋음",
    "convenience": "생활편의시설이 가까움",
    "bus": "버스 접근성이 좋음",
    "tags": "선호 태그와 많이 일치",
    "maintenance": "관리비 선호와 잘 맞음",
}


# 직접취향 57%·행동 33%·최근검색 10%를 합쳐 최종 추천 적합도를 계산하는 함수임
def score_candidate(
    p: PropertyCandidate,
    pref: UserPreferencePayload,
    candidate_vector: dict[str, float],
    vectors_by_id: dict[int, dict[str, float]],
    request: RecommendationRequest,
    nearby: dict,
) -> tuple[float, list[str]]:
    direct, direct_parts = direct_score(p, pref, nearby)
    behavior = behavior_score(candidate_vector, vectors_by_id, request)
    recent = recent_score(p, request.recentSearches)

    base = direct * 0.57 + behavior * 0.33 + recent * 0.10
    final = base * soft_consistency_factor(p, pref)

    reasons = [
        REASON_NAMES[key]
        # 대상 데이터를 하나씩 순회하면서 같은 처리 반복함
        for key, value in direct_parts
        if value >= 0.6 and key in REASON_NAMES
    ][:3]

    # 필수 조건이나 데이터가 없는 경우를 먼저 확인함
    if not reasons:
        reasons = ["전체 취향과 비교했을 때 상대적으로 적합도가 높음"]

    # 계산/조회가 끝난 최종 결과를 호출한 쪽에 반환함
    return round(clamp01(final) * 100, 1), reasons


# 사용자 시설 선호와 지역 선호를 이용해 추천 행정동 TOP 3를 계산하는 함수임
def recommend_neighborhoods(request: RecommendationRequest) -> list[dict]:
    feature = neighborhood_features().copy()
    cluster = neighborhood_clusters()[["admin_code", "cluster_name"]].copy()
    # 공통 Key를 기준으로 서로 다른 DataFrame의 정보를 결합함
    feature = feature.merge(cluster, on="admin_code", how="left")
    pref = request.preference

    # 각 열을 0~1 min-max로 바꿔 단위 차이를 제거함
    # 행정동 Feature 한 컬럼을 0~1 Min-Max 범위로 정규화하는 내부 함수임
    def norm(column: str) -> np.ndarray:
        s = feature[column].astype(float)
        low, high = float(s.min()), float(s.max())
        # 현재 값이나 상태가 해당 조건에 맞는지 확인한 뒤 필요한 분기 처리를 수행함.
        if high == low:
            # 계산/조회가 끝난 최종 결과를 호출한 쪽에 반환함
            return np.ones(len(s)) * 0.5
        # 계산/조회가 끝난 최종 결과를 호출한 쪽에 반환함
        return ((s - low) / (high - low)).to_numpy()

    transport = (norm("station_density") + norm("bus_stop_density")) / 2
    education = (norm("school_density") + norm("academy_density")) / 2
    living = (norm("mart_density") + norm("convenience_density")) / 2
    medical = norm("hospital_density")
    green = (norm("park_density") + norm("park_area_ratio")) / 2

    score = np.zeros(len(feature), dtype=float)
    weight = 0.0
    reasons_by_index = [[] for _ in range(len(feature))]

    # 선택한 생활환경 점수를 가중치만큼 누적하고 점수가 높은 행정동에 추천 이유를 기록하는 내부 함수임
    def add(values: np.ndarray, w: float, reason: str) -> None:
        nonlocal score, weight
        score += values * w
        weight += w
        # 대상 데이터를 하나씩 순회하면서 같은 처리 반복함
        for i, v in enumerate(values):
            # 현재 값이나 상태가 해당 조건에 맞는지 확인한 뒤 필요한 분기 처리를 수행함.
            if v >= 0.65:
                reasons_by_index[i].append(reason)

    if pref.stationPreferred or pref.busPreferred:
        add(transport, 4, "교통 접근성이 좋음")
    # 현재 값이나 상태가 해당 조건에 맞는지 확인한 뒤 필요한 분기 처리를 수행함.
    if pref.educationPreferred:
        add(education, 4, "교육환경이 좋음")
    if pref.conveniencePreferred:
        add(living, 3, "생활편의시설이 많음")
    # 현재 값이나 상태가 해당 조건에 맞는지 확인한 뒤 필요한 분기 처리를 수행함.
    if pref.hospitalPreferred:
        add(medical, 2, "의료 접근성이 좋음")
    if pref.parkPreferred:
        add(green, 3, "공원·녹지 접근성이 좋음")

    # 선택된 시설선호가 없더라도 기본 생활 균형으로 계산함
    if weight == 0:
        add((transport + living + medical + education + green) / 5, 1, "생활환경이 균형적임")

    base = score / max(weight, 1)

    # 직접 선호지역/최근 검색지역은 점수만 보정함
    district_bonus = np.ones(len(feature))
    # 현재 값이나 상태가 해당 조건에 맞는지 확인한 뒤 필요한 분기 처리를 수행함.
    if pref.preferredDistricts:
        district_bonus = np.where(feature["district_name"].isin(pref.preferredDistricts), 1.0, 0.85)

    recent_districts = [s.districtName for s in request.recentSearches[:5] if s.districtName]
    recent_bonus = np.where(feature["district_name"].isin(recent_districts), 1.05, 1.0)

    final = np.clip(base * district_bonus * recent_bonus, 0, 1)
    order = np.argsort(-final)[:3]

    result = []
    # 대상 데이터를 하나씩 순회하면서 같은 처리 반복함
    for i in order:
        row = feature.iloc[int(i)]
        reasons = reasons_by_index[int(i)][:2] or ["전체 생활환경 적합도가 높음"]
        result.append({
            "adminCode": str(row["admin_code"]),
            "adminName": str(row["admin_name"]),
            "districtName": str(row["district_name"]),
            "score": round(float(final[int(i)]) * 100, 1),
            "clusterName": None if str(row.get("cluster_name", "")) == "nan" else str(row.get("cluster_name")),
            "reasons": reasons,
        })
    # 계산/조회가 끝난 최종 결과를 호출한 쪽에 반환함
    return result


# 싫어요 후보 제거부터 BEST 유지 규칙까지 적용해 최종 매물 TOP 3를 만드는 추천 핵심 함수임
def recommend(request: RecommendationRequest) -> dict:
    disliked = set(request.dislikedPropertyIds)
    candidates = [p for p in request.candidates if p.id not in disliked]

    all_properties: dict[int, PropertyCandidate] = {
        p.id: p for p in [*candidates, *request.behaviorProperties]
    }

    nearby_by_id: dict[int, dict] = {}
    vectors_by_id: dict[int, dict[str, float]] = {}

    # 대상 데이터를 하나씩 순회하면서 같은 처리 반복함
    for p in all_properties.values():
        nearby = get_nearby_features(p.latitude, p.longitude)
        nearby_by_id[p.id] = nearby
        vectors_by_id[p.id] = property_vector(p, nearby)

    scored = []
    # 대상 데이터를 하나씩 순회하면서 같은 처리 반복함
    for p in candidates:
        score, reasons = score_candidate(
            p,
            request.preference,
            vectors_by_id[p.id],
            vectors_by_id,
            request,
            nearby_by_id[p.id],
        )
        scored.append({
            "propertyId": p.id,
            "score": score,
            "reasons": reasons,
            "isUserBest": False,
            "isAiBest": False,
        })

    scored.sort(key=lambda x: x["score"], reverse=True)
    # 필수 조건이나 데이터가 없는 경우를 먼저 확인함
    if not scored:
        # 계산/조회가 끝난 최종 결과를 호출한 쪽에 반환함
        return {
            "modelVersion": "recommendation-v1",
            "items": [],
            "neighborhoods": recommend_neighborhoods(request),
        }

    by_id = {item["propertyId"]: item for item in scored}
    valid_user_best = (
        request.bestPropertyId is not None
        and request.bestPropertyId in by_id
        and request.bestPropertyId not in disliked
    )

    result = []
    # 현재 값이나 상태가 해당 조건에 맞는지 확인한 뒤 필요한 분기 처리를 수행함.
    if valid_user_best:
        best = dict(by_id[request.bestPropertyId])
        best["isUserBest"] = True
        result.append(best)

        rest = [x for x in scored if x["propertyId"] != request.bestPropertyId]
        unseen = [x for x in rest if x["propertyId"] not in request.shownPropertyIds]
        pool = unseen + [x for x in rest if x not in unseen]
        result.extend(pool[:2])
    else:
        ai_best = dict(scored[0])
        ai_best["isAiBest"] = True
        result.append(ai_best)

        rest = scored[1:]
        unseen = [x for x in rest if x["propertyId"] not in request.shownPropertyIds]
        pool = unseen + [x for x in rest if x not in unseen]
        result.extend(pool[:2])

    # 계산/조회가 끝난 최종 결과를 호출한 쪽에 반환함
    return {
        "modelVersion": "recommendation-v1",
        "items": result[:3],
        "neighborhoods": recommend_neighborhoods(request),
    }