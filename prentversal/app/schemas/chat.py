# AI 챗봇 요청·응답 Schema

# 이 파일에서 사용할 표준/외부 모듈과 프로젝트 내부 기능 불러옴
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


# 화면에 쌓인 대화 한 줄을 정의하는 Schema임
# 대화를 DB에 저장하지 않기로 했으므로, 화면이 들고 있던 기록을 매 요청마다 통째로 보낸다.
class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


# 사용자가 지금 보고 있는 화면 정보를 전달하는 Schema임
# "이 매물 시세 적정해?"처럼 지시대명사로 물었을 때 무엇을 가리키는지 알기 위해 쓴다.
class ChatPageContext(BaseModel):
    path: str | None = None
    propertyId: int | None = None


# Spring이 챗봇 API로 보내는 요청 전체를 정의하는 Schema임
class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    pageContext: ChatPageContext | None = None

    # 도구를 실행할 때 Spring API를 되부르면서 그대로 붙일 사용자 토큰임.
    # 챗봇이 사용자보다 더 큰 권한을 갖지 않도록, 새 토큰을 만들지 않고 받은 것을 그대로 쓴다.
    accessToken: str | None = None


# 답변과 함께 화면에 카드로 그릴 매물 한 건을 정의하는 Schema임
class ChatPropertyCard(BaseModel):
    id: int
    name: str | None = None
    dealType: str | None = None
    priceLabel: str | None = None
    address: str | None = None
    areaLabel: str | None = None
    typeLabel: str | None = None
    thumbnailUrl: str | None = None


# 챗봇이 Spring에 돌려주는 응답 전체를 정의하는 Schema임
class ChatResponse(BaseModel):
    reply: str

    # 도구가 찾아온 매물. 화면은 이것을 클릭 가능한 카드로 그린다.
    properties: list[ChatPropertyCard] = Field(default_factory=list)
