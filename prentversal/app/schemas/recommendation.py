# 이 파일에서 사용할 표준/외부 모듈과 프로젝트 내부 기능 불러옴
from __future__ import annotations

from pydantic import BaseModel, Field


# Spring이 추천 계산 후보로 보내는 매물의 가격·면적·좌표·태그 정보를 정의하는 Schema임
class PropertyCandidate(BaseModel):
    id: int
    propertyType: str
    dealType: str
    districtName: str
    area: float
    floor: int | None = None
    roomCount: int | None = None
    bathroomCount: int | None = None
    buildYear: int | None = None
    maintenanceFee: int | None = None

    price: int | None = None
    deposit: int | None = None
    monthlyDeposit: int | None = None
    monthlyRent: int | None = None

    latitude: float
    longitude: float
    tags: list[str] = []


# 사용자가 초기설정에서 저장한 거래·지역·예산·생활환경 선호를 추천 API에 전달하는 Schema임
class UserPreferencePayload(BaseModel):
    dealType: str | None = None
    propertyTypes: list[str] = []
    preferredDistricts: list[str] = []

    minArea: float | None = None
    maxArea: float | None = None
    minRoomCount: int | None = None

    saleMinPrice: int | None = None
    saleMaxPrice: int | None = None
    jeonseMinDeposit: int | None = None
    jeonseMaxDeposit: int | None = None
    monthlyMinDeposit: int | None = None
    monthlyMaxDeposit: int | None = None
    monthlyMinRent: int | None = None
    monthlyMaxRent: int | None = None

    newBuildPreferred: bool = False
    stationPreferred: bool = False
    educationPreferred: bool = False
    parkPreferred: bool = False
    hospitalPreferred: bool = False
    conveniencePreferred: bool = False
    busPreferred: bool = False
    lowMaintenancePreferred: bool = False
    preferredTags: list[str] = []


# 최근 검색의 지역·거래유형·매물유형·가격범위를 추천 점수에 전달하는 Schema임
class RecentSearchPayload(BaseModel):
    districtName: str | None = None
    dealType: str | None = None
    propertyType: str | None = None
    minPrice: int | None = None
    maxPrice: int | None = None


# 취향·후보매물·행동기록·최근검색·기노출 매물을 한 번에 받는 추천 요청 Schema임
class RecommendationRequest(BaseModel):
    preference: UserPreferencePayload
    candidates: list[PropertyCandidate]

    # 과거 LIKE/FAVORITE/BEST에 쓰인 매물이 후보에서 빠져 있어도 행동 벡터를 만들 수 있도록 별도 전달함
    behaviorProperties: list[PropertyCandidate] = []
    likedPropertyIds: list[int] = []
    dislikedPropertyIds: list[int] = []
    favoritePropertyIds: list[int] = []
    bestPropertyId: int | None = None

    recentSearches: list[RecentSearchPayload] = []
    shownPropertyIds: list[int] = []


# 추천된 매물 ID·적합점수·추천이유·BEST 여부를 표현하는 응답 항목 Schema임
class RecommendationItem(BaseModel):
    propertyId: int
    score: float
    reasons: list[str]
    isUserBest: bool = False
    isAiBest: bool = False


# 추천된 행정동의 코드·이름·적합점수·군집명·추천이유를 표현하는 Schema임
class NeighborhoodRecommendationItem(BaseModel):
    adminCode: str
    adminName: str
    districtName: str
    score: float
    clusterName: str | None = None
    reasons: list[str]


# 매물 TOP 3와 동네 TOP 3 추천결과 및 추천 버전을 함께 반환하는 최종 응답 Schema임
class RecommendationResponse(BaseModel):
    modelVersion: str = "recommendation-v1"
    items: list[RecommendationItem]
    neighborhoods: list[NeighborhoodRecommendationItem]