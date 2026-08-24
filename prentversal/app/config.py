# 모델·데이터·outputs 공통 경로와 챗봇 환경설정

# 이 파일에서 사용할 표준/외부 모듈과 프로젝트 내부 기능 불러옴
from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

# 입력·출력 파일 위치를 한 곳에서 재사용할 수 있도록 경로를 미리 정의함.
BASE_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = BASE_DIR / "data"
REFERENCE_DIR = DATA_DIR / "reference"
PROCESSED_DIR = DATA_DIR / "processed"
# 입력·출력 파일 위치를 한 곳에서 재사용할 수 있도록 경로를 미리 정의함.
MODELS_DIR = BASE_DIR / "models"
OUTPUTS_DIR = BASE_DIR / "outputs"

# 로컬에서는 prentversal/.env를, 배포에서는 컨테이너 환경변수를 읽는다.
# .env가 없어도 load_dotenv는 조용히 넘어가므로 배포 환경에서도 그대로 쓸 수 있다.
load_dotenv(BASE_DIR / ".env")

# AI 챗봇이 쓰는 OpenAI 설정.
# 키가 없으면 서버는 정상 기동하고 챗봇 요청만 거절한다.
# 챗봇 하나 때문에 시세예측·추천까지 못 뜨게 만들 이유가 없다.

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "").strip()
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini").strip()

# 챗봇이 도구를 실행할 때 되돌아가서 호출하는 Spring 주소.
# 로컬은 localhost:9022, 배포에서는 메인 EC2의 Private IP를 환경변수로 넣는다.
SPRING_BASE_URL = os.getenv("SPRING_BASE_URL", "http://127.0.0.1:9022").strip().rstrip("/")