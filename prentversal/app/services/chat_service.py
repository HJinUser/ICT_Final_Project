# AI 챗봇 대화 처리 (OpenAI Function Calling)

# 이 파일에서 사용할 표준/외부 모듈과 프로젝트 내부 기능 불러옴
from __future__ import annotations

import json
import logging

from openai import OpenAI, OpenAIError

from app.config import OPENAI_API_KEY, OPENAI_MODEL
from app.schemas.chat import ChatMessage, ChatPageContext
from app.services.chat_tools import TOOLS, run_tool

logger = logging.getLogger(__name__)

# 도구를 부르고 그 결과로 다시 부르는 왕복 횟수 제한.
# LLM이 같은 도구를 계속 부르며 도는 경우에 비용과 응답 시간이 무한히 늘어나는 것을 막는다.
MAX_TOOL_ROUNDS = 3

# 화면이 보낸 대화 기록 중 최근 몇 개만 쓸지.
# 대화를 저장하지 않는 구조라 기록이 통째로 올라오는데, 길어질수록 토큰만 늘어난다.
MAX_HISTORY = 12

SYSTEM_PROMPT = """너는 부동산 서비스 '전세역전'의 안내 도우미다.

할 수 있는 일
- search_properties : 조건에 맞는 매물 찾기
- get_property_detail : 매물 하나의 상세 정보와 AI 예상 시세 확인

지켜야 할 것
- 매물 정보는 반드시 도구를 호출해서 얻는다. 도구가 준 값에 없는 내용을 지어내지 않는다.
- 도구가 실패했다고 알려 오면 그 사실을 솔직히 전한다. 실패를 감추고 그럴듯하게 답하지 않는다.
- 금액은 만원 단위로 들어온다. 사람이 읽기 쉽게 '5억 2,000만원'처럼 바꿔서 말한다.
- 한국어로 답한다.

답변 길이
- 2~3문장으로 짧게 쓴다. 목록이나 번호 매김을 쓰지 않는다.
- 찾은 매물은 화면이 카드로 따로 보여 준다. 그러므로 매물을 하나씩 나열하지 않는다.
  몇 건을 찾았는지 말하고, 눈에 띄는 특징 한두 가지만 덧붙인다.
- 매물이 한 건뿐이거나 사용자가 특정 매물을 짚어 물었을 때만 그 매물을 자세히 설명한다.

할 수 없는 일을 물었을 때
- 계약, 예약, 문의 보내기, 회원정보 변경 같은 일은 도구에 없으므로 할 수 없다.
- 이때 화면 이름이나 버튼 위치를 지어내서 안내하지 않는다. 너는 서비스 화면 구조를 알지 못한다.
  '챗봇에서는 처리할 수 없다'는 것과 '매물 상세 화면의 중개사무소에 문의하면 된다'는 정도만 말한다."""


# 사용자가 보고 있는 화면을 LLM이 알 수 있도록 안내 문장으로 바꾸는 함수임
def _page_context_prompt(page_context: ChatPageContext | None) -> str | None:
    # 화면 정보를 안 보낸 요청도 있으므로 먼저 확인한다.
    if page_context is None:
        return None

    lines: list[str] = []

    # 현재 값이나 상태가 해당 조건에 맞는지 확인한 뒤 필요한 분기 처리를 수행함.
    if page_context.path:
        lines.append(f"사용자가 지금 보고 있는 화면 주소는 {page_context.path} 이다.")

    # 매물 상세 화면이면 '이 매물'이 무엇인지 알려 줘야 지시대명사가 통한다.
    if page_context.propertyId is not None:
        lines.append(
            f"지금 보고 있는 매물의 번호는 {page_context.propertyId} 이다. "
            "사용자가 '이 매물', '이거', '여기'라고 하면 이 매물을 가리킨다."
        )

    # 계산이 끝난 결과를 호출한 쪽에서 이어서 사용할 수 있도록 반환함.
    return "\n".join(lines) if lines else None


# 화면이 보낸 대화 기록과 화면 정보를 OpenAI에 넘길 messages 목록으로 만드는 함수임
def _build_messages(
    messages: list[ChatMessage],
    page_context: ChatPageContext | None,
) -> list[dict]:
    built: list[dict] = [{"role": "system", "content": SYSTEM_PROMPT}]

    context_prompt = _page_context_prompt(page_context)
    # 화면 정보는 system 역할로 따로 붙인다. 사용자가 쓴 말과 섞이지 않게 하기 위함이다.
    if context_prompt:
        built.append({"role": "system", "content": context_prompt})

    # 대상 데이터를 하나씩 순회하면서 각 항목에 동일한 처리 규칙을 적용함.
    for message in messages[-MAX_HISTORY:]:
        built.append({"role": message.role, "content": message.content})

    # 계산이 끝난 결과를 호출한 쪽에서 이어서 사용할 수 있도록 반환함.
    return built


# OpenAI가 넘겨준 도구 인자 문자열을 dict로 바꾸는 함수임
def _parse_arguments(raw: str | None) -> dict:
    # 인자가 없는 도구 호출도 있으므로 빈 값을 먼저 처리한다.
    if not raw:
        return {}

    # 모델이 만든 문자열이라 JSON이 깨져 있을 수 있다. 깨졌다고 대화를 끊지 않고 빈 인자로 진행한다.
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        logger.warning("도구 인자를 JSON으로 읽지 못했습니다: %s", raw)
        return {}

    # 계산이 끝난 결과를 호출한 쪽에서 이어서 사용할 수 있도록 반환함.
    return parsed if isinstance(parsed, dict) else {}


# 같은 매물이 여러 도구 호출에서 겹쳐 나와도 카드가 중복되지 않게 걸러 주는 함수임
def _merge_cards(collected: list[dict], new_cards: list[dict]) -> None:
    seen = {card.get("id") for card in collected}

    # 대상 데이터를 하나씩 순회하면서 각 항목에 동일한 처리 규칙을 적용함.
    for card in new_cards:
        # 매물 번호가 없는 카드는 화면에서 상세로 보낼 수 없으므로 버린다.
        if card.get("id") is None or card["id"] in seen:
            continue

        seen.add(card["id"])
        collected.append(card)


# 대화와 화면 정보를 받아 도구를 호출해 가며 최종 답변을 만드는 함수임
def run_chat(
    messages: list[ChatMessage],
    page_context: ChatPageContext | None,
    access_token: str | None,
) -> dict:
    # 키가 없으면 호출해 봐야 인증 오류만 나므로, 원인을 분명히 알리고 먼저 멈춘다.
    if not OPENAI_API_KEY:
        raise RuntimeError("OPENAI_API_KEY가 설정되지 않아 챗봇을 사용할 수 없습니다.")

    client = OpenAI(api_key=OPENAI_API_KEY)
    conversation = _build_messages(messages, page_context)
    cards: list[dict] = []

    # 도구 호출 -> 결과 반영 -> 재질문을 정해진 횟수만큼만 반복함
    for _ in range(MAX_TOOL_ROUNDS):
        # 네트워크 오류·인증 실패·잔액 부족이 모두 OpenAIError로 올라온다.
        try:
            response = client.chat.completions.create(
                model=OPENAI_MODEL,
                messages=conversation,
                tools=TOOLS,
            )
        except OpenAIError as error:
            logger.warning("OpenAI 호출이 실패했습니다: %s", error)
            raise RuntimeError("AI 응답을 받지 못했습니다.") from error

        ai_message = response.choices[0].message

        # 도구를 부르지 않았다면 이번 답변이 최종 답변이다.
        if not ai_message.tool_calls:
            return {
                "reply": ai_message.content or "답변을 만들지 못했습니다. 다시 물어봐 주세요.",
                "properties": cards,
            }

        # 어떤 도구를 부르기로 했는지 대화에 남겨야 다음 요청에서 결과와 짝이 맞는다.
        conversation.append(ai_message)

        # 대상 데이터를 하나씩 순회하면서 각 항목에 동일한 처리 규칙을 적용함.
        for tool_call in ai_message.tool_calls:
            arguments = _parse_arguments(tool_call.function.arguments)
            content, new_cards = run_tool(tool_call.function.name, arguments, access_token)
            _merge_cards(cards, new_cards)

            # 수업 예제는 role을 "function"으로 썼지만 그것은 구버전 방식이다.
            # 지금 쓰는 openai 패키지에서는 "tool"이어야 tool_call_id와 짝이 맞는다.
            conversation.append({
                "role": "tool",
                "tool_call_id": tool_call.id,
                "content": content,
            })

    # 정해진 횟수를 다 쓰고도 최종 문장이 나오지 않은 경우임
    logger.warning("도구 호출 한도(%d회)를 넘겨 대화를 정리했습니다.", MAX_TOOL_ROUNDS)
    return {
        "reply": "찾는 데 시간이 너무 오래 걸립니다. 조건을 조금 더 구체적으로 알려 주세요.",
        "properties": cards,
    }
