# FastAPI Health API 정상 동작 테스트

# 이 파일에서 사용할 표준/외부 모듈과 프로젝트 내부 기능 불러옴
from fastapi.testclient import TestClient

from app.main import app

# 실제 서버를 띄우지 않고 FastAPI 요청을 테스트할 클라이언트를 준비함.
client = TestClient(app)


# /health 호출이 HTTP 200과 {"status":"ok"} 응답을 반환하는지 확인하는 테스트 함수임
def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    # /health 응답 JSON 내용이 정확히 {"status":"ok"}인지 검증함
    assert response.json() == {"status": "ok"}