# AI 챗봇 API 엔드포인트

# 이 파일에서 사용할 표준/외부 모듈과 프로젝트 내부 기능 불러옴
from fastapi import APIRouter, HTTPException

from app.schemas.chat import ChatRequest, ChatResponse
from app.services.chat_service import run_chat

# 이 기능의 공통 URL prefix와 문서 태그를 FastAPI Router에 설정함.
router = APIRouter(prefix="/ml/chat", tags=["ML Chat"])


# 대화와 화면 정보를 받아 도구를 호출해 만든 답변을 반환하는 API 함수임
# React가 직접 부르지 않는다. Spring이 로그인 여부를 확인한 뒤 대신 호출한다.
@router.post("")
def chat(request: ChatRequest) -> ChatResponse:
    # 대화가 비어 있으면 물어본 것이 없다는 뜻이라 모델을 부르지 않는다.
    if not request.messages:
        # 서비스 오류를 FastAPI HTTP 오류 응답으로 변환함
        raise HTTPException(status_code=400, detail="대화 내용이 비어 있습니다.")

    # 키 누락이나 OpenAI 호출 실패를 서비스가 RuntimeError로 올려 준다.
    try:
        result = run_chat(
            messages=request.messages,
            page_context=request.pageContext,
            access_token=request.accessToken,
        )
    except RuntimeError as error:
        # 서비스 오류를 FastAPI HTTP 오류 응답으로 변환함
        raise HTTPException(status_code=503, detail=str(error)) from error

    # 계산/조회가 끝난 최종 결과를 호출한 쪽에 반환함
    return ChatResponse(**result)
