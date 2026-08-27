# 동네 군집·키워드 API 엔드포인트

# 이 파일에서 사용할 표준/외부 모듈과 프로젝트 내부 기능 불러옴
from fastapi import APIRouter, HTTPException

from app.services.admin_dong_service import resolve_admin_dong
from app.services.legal_admin_mapping_service import resolve_legal_dong
from app.services.neighborhood_service import (
    find_all_neighborhoods,
    find_cluster_tag_groups,
    find_neighborhood,
    find_tag_suggestions,
)

# 이 기능의 공통 URL prefix와 문서 태그를 FastAPI Router에 설정함.
router = APIRouter(prefix="/ml/neighborhood", tags=["ML Neighborhood"])


# 서울 전체 행정동 목록에 군집명을 붙여 반환하는 API 함수임.
# 동네 탐색이 425개 행정동을 한 번에 그릴 때 이 API 하나만 부른다(행정동마다 따로 부르지 않는다).
@router.get("")
def list_all():
    return find_all_neighborhoods()


# 동네 유형별 태그 배분표를 반환하는 API 함수임. 화면의 태그 필터가 이 묶음대로 칩을 그린다.
# 아래 /{admin_code} 보다 먼저 선언해야 "cluster-tag-groups"가 행정동 코드로 잡히지 않음
@router.get("/cluster-tag-groups")
def cluster_tag_groups():
    return find_cluster_tag_groups()


# 한줄평 키워드에서 뽑은 행정동별 태그 추천 결과를 반환하는 API 함수임.
# 관리자가 검토해서 붙이는 후보이고, 이 API가 직접 태그를 붙이지는 않는다.
# 아래 /{admin_code} 보다 먼저 선언해야 "tag-suggestions"가 행정동 코드로 잡히지 않음
@router.get("/tag-suggestions")
def tag_suggestions():
    return find_tag_suggestions()


# 위경도 좌표가 속한 행정동을 판정해 반환하는 API 함수임
# 아래 /{admin_code} 보다 먼저 선언해야 "resolve"가 행정동 코드로 잡히지 않음
@router.get("/resolve")
def resolve(lat: float, lng: float):
    result = resolve_admin_dong(lat, lng)
    # 현재 값이나 상태가 해당 조건에 맞는지 확인한 뒤 필요한 분기 처리를 수행함.
    if result is None:
        # 서비스 오류를 FastAPI HTTP 오류 응답으로 변환함
        raise HTTPException(status_code=404, detail="서울 행정동 경계 안에서 찾지 못했습니다.")
    # 계산/조회가 끝난 최종 결과를 호출한 쪽에 반환함
    return result


# 법정동 이름으로 행정동 AI 분석 결과를 찾아 돌려주는 API 함수임.
#
# 동네 탐색(Spring neighborhoods 테이블)은 법정동 기준이고 이 분석은 행정동 기준이라
# 이름이 서로 다르다. Spring이 자기 DB의 (자치구, 법정동)을 이 API에 넘기면
# 여기서 행정동으로 바꾼 뒤 기존 분석 결과를 그대로 돌려준다.
#
# 아래 /{admin_code} 보다 먼저 선언해야 "by-legal"이 행정동 코드로 잡히지 않는다.
@router.get("/by-legal")
def get_neighborhood_by_legal(district: str, legalDong: str):
    resolved = resolve_legal_dong(district, legalDong)
    # 현재 값이나 상태가 해당 조건에 맞는지 확인한 뒤 필요한 분기 처리를 수행함.
    if resolved is None:
        # 서비스 오류를 FastAPI HTTP 오류 응답으로 변환함
        raise HTTPException(status_code=404, detail="이 법정동에 대응하는 행정동 매핑이 없습니다.")

    result = find_neighborhood(resolved["adminCode"])
    # 매핑표는 K-Means 결과와 이미 대조해 만든 것이라 이 경우가 생기면 매핑표 자체가 잘못된 것임
    if result is None:
        # 서비스 오류를 FastAPI HTTP 오류 응답으로 변환함
        raise HTTPException(status_code=404, detail="행정동 분석 결과가 없습니다.")
    # 계산/조회가 끝난 최종 결과를 호출한 쪽에 반환함
    return result


# 행정동 분석결과를 조회하고 없으면 404를 반환하는 API 함수임
@router.get("/{admin_code}")
def get_neighborhood(admin_code: str):
    result = find_neighborhood(admin_code)
    # 현재 값이나 상태가 해당 조건에 맞는지 확인한 뒤 필요한 분기 처리를 수행함.
    if result is None:
        # 서비스 오류를 FastAPI HTTP 오류 응답으로 변환함
        raise HTTPException(status_code=404, detail="행정동 분석 결과가 없습니다.")
    # 계산/조회가 끝난 최종 결과를 호출한 쪽에 반환함
    return result
