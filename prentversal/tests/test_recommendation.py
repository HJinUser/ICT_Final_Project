# 맞춤 추천 핵심 규칙 테스트

# 이 파일에서 사용할 표준/외부 모듈과 프로젝트 내부 기능 불러옴
from app.services.recommendation_service import range_score, _budget_one


# 값이 희망 범위 안에 있으면 range_score가 1.0을 반환하는지 확인하는 테스트 함수임
def test_range_score_inside_range():
    assert range_score(50, 40, 60) == 1.0


# 값이 희망 범위를 벗어나면 range_score가 1.0보다 낮아지는지 확인하는 테스트 함수임
def test_range_score_outside_range_is_lower():
    assert range_score(80, 40, 60) < 1.0


# 가격이 예산 범위 안에 있으면 _budget_one이 감점 없는 1.0을 반환하는지 확인하는 테스트 함수임
def test_budget_inside_range():
    assert _budget_one(90, 50, 100) == 1.0


# 예산 초과 가격이 0보다 크고 1보다 작은 감점값을 받아 후보에서 제거되지 않는지 확인하는 테스트 함수임
def test_budget_over_range_is_penalized_but_not_removed():
    score = _budget_one(120, 50, 100)
    assert 0 < score < 1