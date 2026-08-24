# AI 챗봇이 호출하는 도구 정의와 실제 실행 처리

# 이 파일에서 사용할 표준/외부 모듈과 프로젝트 내부 기능 불러옴
from __future__ import annotations

import json
import logging

import httpx

from app.config import SPRING_BASE_URL

logger = logging.getLogger(__name__)

# Spring 호출이 늦어질 때 챗봇 응답 전체가 묶이지 않도록 제한을 둠.
REQUEST_TIMEOUT = 10.0

# 검색 결과를 전부 LLM에게 넘기면 토큰만 쓰고 답변 품질은 나아지지 않는다.
# 화면 카드도 이 개수까지만 그린다.
SEARCH_RESULT_LIMIT = 6

# 매물 유형·거래 유형은 서버가 정해 둔 코드값이라 LLM이 지어내면 안 된다.
# enum으로 못 박아 두면 OpenAI가 이 중에서만 고른다.
PROPERTY_TYPES = ["ONE_TWO_ROOM", "APARTMENT", "VILLA", "OFFICETEL"]
DEAL_TYPES = ["SALE", "JEONSE", "MONTHLY"]
SORT_TYPES = ["LATEST", "PRICE_ASC", "PRICE_DESC", "AREA_DESC", "AREA_ASC"]

# 매물 상세 응답은 검색과 달리 완성된 한글 문구를 주지 않고 코드값과 숫자만 준다.
# 카드를 검색 결과와 같은 모양으로 그리려면 여기서 같은 규칙으로 문구를 만들어야 한다.
PROPERTY_TYPE_LABELS = {
    "ONE_TWO_ROOM": "원/투룸",
    "APARTMENT": "아파트",
    "VILLA": "주택/빌라",
    "OFFICETEL": "오피스텔",
}


# 매물 검색 도구의 이름·설명·인자 형식을 OpenAI에게 알려 주는 정의임
SEARCH_PROPERTIES_TOOL = {
    "type": "function",
    "function": {
        "name": "search_properties",
        "description": (
            "조건에 맞는 매물을 검색한다. "
            "사용자가 지역, 가격대, 방 개수, 매물 유형 등으로 집을 찾을 때 사용한다. "
            "조건을 하나도 주지 않으면 최근 등록순으로 돌려준다."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "keyword": {
                    "type": "string",
                    "description": "자유 검색어. 매물 이름이나 주소 일부. 예: '반포 리버뷰'",
                },
                "region": {
                    "type": "string",
                    "description": "자치구 이름. 반드시 '구'까지 붙인다. 예: '서초구'",
                },
                "dong": {
                    "type": "string",
                    "description": "동 이름. 예: '반포동'",
                },
                "type": {
                    "type": "string",
                    "enum": PROPERTY_TYPES,
                    "description": "매물 유형. 원/투룸, 아파트, 주택·빌라, 오피스텔 순서로 대응한다.",
                },
                "dealType": {
                    "type": "string",
                    "enum": DEAL_TYPES,
                    "description": "거래 유형. 매매, 전세, 월세 순서로 대응한다.",
                },
                "minPrice": {
                    "type": "integer",
                    "description": "최소 금액(만원 단위). 5억이면 50000을 넣는다.",
                },
                "maxPrice": {
                    "type": "integer",
                    "description": "최대 금액(만원 단위). 5억이면 50000을 넣는다.",
                },
                "minArea": {
                    "type": "number",
                    "description": "최소 전용면적(제곱미터). 1평은 약 3.3제곱미터다.",
                },
                "maxArea": {
                    "type": "number",
                    "description": "최대 전용면적(제곱미터).",
                },
                "roomCounts": {
                    "type": "array",
                    "items": {"type": "integer"},
                    "description": "방 개수 목록. 3개 이상을 원하면 3을 넣는다. 예: [1, 2]",
                },
                "sort": {
                    "type": "string",
                    "enum": SORT_TYPES,
                    "description": "정렬 기준. 싼 것부터면 PRICE_ASC, 넓은 것부터면 AREA_DESC.",
                },
            },
            "required": [],
        },
    },
}


# 매물 상세 조회 도구의 이름·설명·인자 형식을 OpenAI에게 알려 주는 정의임
GET_PROPERTY_DETAIL_TOOL = {
    "type": "function",
    "function": {
        "name": "get_property_detail",
        "description": (
            "매물 하나의 상세 정보를 가져온다. AI 예상 시세와 시세 평가가 함께 들어 있어서 "
            "'이 매물 시세가 적정한지' 물었을 때 이 도구를 쓴다. "
            "매물 번호를 모르면 먼저 search_properties로 찾는다."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "propertyId": {
                    "type": "integer",
                    "description": "매물 번호",
                },
            },
            "required": ["propertyId"],
        },
    },
}

TOOLS = [SEARCH_PROPERTIES_TOOL, GET_PROPERTY_DETAIL_TOOL]


# 사용자 토큰이 있으면 Authorization 헤더로 만들어 주는 함수임
def _auth_headers(access_token: str | None) -> dict[str, str]:
    # 토큰이 없어도 매물 조회는 공개 API라 동작한다. 있으면 붙여서 권한을 그대로 물려준다.
    if not access_token:
        return {}

    return {"Authorization": access_token}


# Spring API를 GET으로 호출하고 JSON을 돌려주는 함수임
def _spring_get(path: str, access_token: str | None, params: dict | None = None):
    url = f"{SPRING_BASE_URL}{path}"

    # 네트워크·타임아웃·4xx·5xx 어느 쪽으로 실패하든 챗봇 전체가 죽지 않도록 여기서 막는다.
    with httpx.Client(timeout=REQUEST_TIMEOUT) as client:
        response = client.get(url, params=params, headers=_auth_headers(access_token))
        response.raise_for_status()
        # 계산/조회가 끝난 최종 결과를 호출한 쪽에 반환함
        return response.json()


# 검색 결과 한 건에서 화면 카드에 필요한 값만 추려 내는 함수임
def _to_card(item: dict) -> dict:
    # 계산/조회가 끝난 최종 결과를 호출한 쪽에 반환함
    return {
        "id": item.get("id"),
        "name": item.get("name"),
        "dealType": item.get("dealType"),
        "priceLabel": item.get("priceLabel"),
        "address": item.get("address"),
        "areaLabel": item.get("areaLabel"),
        "typeLabel": item.get("typeLabel"),
        "thumbnailUrl": item.get("thumbnailUrl"),
    }


# 검색 결과를 LLM이 읽을 만큼만 줄여서 요약하는 함수임
def _summarize_search(item: dict) -> dict:
    # 계산/조회가 끝난 최종 결과를 호출한 쪽에 반환함
    return {
        "id": item.get("id"),
        "name": item.get("name"),
        "priceLabel": item.get("priceLabel"),
        "typeLabel": item.get("typeLabel"),
        "areaLabel": item.get("areaLabel"),
        "floor": item.get("floor"),
        "roomCount": item.get("roomCount"),
        "address": item.get("address"),
        "keywords": item.get("keywords", []),
        "statusLabel": item.get("statusLabel"),
    }


# 매물 검색 도구를 실제로 실행하고 LLM용 요약과 화면 카드를 함께 돌려주는 함수임
def _run_search(arguments: dict, access_token: str | None) -> tuple[str, list[dict]]:
    # LLM이 값을 비워서 보내는 경우가 있어, None인 항목은 아예 빼고 보낸다.
    params = {key: value for key, value in arguments.items() if value not in (None, "", [])}

    data = _spring_get("/property/search", access_token, params=params)

    items = data.get("content", []) or []
    total = data.get("totalCount", len(items))
    shown = items[:SEARCH_RESULT_LIMIT]

    payload = {
        "totalCount": total,
        "shownCount": len(shown),
        "items": [_summarize_search(item) for item in shown],
    }

    # 계산/조회가 끝난 최종 결과를 호출한 쪽에 반환함
    return json.dumps(payload, ensure_ascii=False), [_to_card(item) for item in shown]


# 거래 유형에 맞는 AI 예상 시세만 골라 내는 함수임
def _ai_price_of(detail: dict) -> dict:
    deal_type = detail.get("dealType")

    # 매매·전세·월세가 각각 다른 칸을 쓰므로, 해당하는 값만 추려서 넘긴다.
    if deal_type == "SALE":
        return {"aiPrice": detail.get("aiPrice")}

    if deal_type == "JEONSE":
        return {"aiDeposit": detail.get("aiDeposit")}

    if deal_type == "MONTHLY":
        return {
            "aiMonthlyDeposit": detail.get("aiMonthlyDeposit"),
            "aiMonthlyRent": detail.get("aiMonthlyRent"),
        }

    # 계산/조회가 끝난 최종 결과를 호출한 쪽에 반환함
    return {}


# 매물 상세 도구를 실제로 실행하고 LLM용 요약과 화면 카드를 함께 돌려주는 함수임
def _run_detail(arguments: dict, access_token: str | None) -> tuple[str, list[dict]]:
    property_id = arguments.get("propertyId")
    # 매물 번호가 없으면 호출 자체가 성립하지 않으므로 LLM에게 그대로 알려 다시 묻게 한다.
    if property_id is None:
        return "매물 번호가 없어 조회하지 못했습니다.", []

    detail = _spring_get(f"/property/{property_id}", access_token)

    payload = {
        "id": detail.get("id"),
        "name": detail.get("name"),
        # 코드값을 그대로 주면 LLM이 "OFFICETEL 매물입니다"처럼 답한다. 한글 이름으로 바꿔서 넘긴다.
        "typeLabel": PROPERTY_TYPE_LABELS.get(detail.get("type"), detail.get("type")),
        "dealType": detail.get("dealType"),
        "address": detail.get("address"),
        "area": detail.get("area"),
        "floor": detail.get("floor"),
        "roomCount": detail.get("roomCount"),
        "bathroomCount": detail.get("bathroomCount"),
        "buildYear": detail.get("buildYear"),
        "maintenanceFee": detail.get("maintenanceFee"),
        "price": detail.get("price"),
        "deposit": detail.get("deposit"),
        "monthlyDeposit": detail.get("monthlyDeposit"),
        "monthlyRent": detail.get("monthlyRent"),
        # 시세가 적정한지 답하려면 이 두 가지가 핵심이다.
        "priceEvaluation": detail.get("priceEvaluation"),
        "description": detail.get("description"),
        "tags": [tag.get("name") for tag in (detail.get("tags") or [])],
    }
    payload.update(_ai_price_of(detail))

    # 검색 결과 카드와 같은 모양으로 보이도록 금액·면적·유형 문구를 여기서 만들어 붙인다.
    card = {
        "id": detail.get("id"),
        "name": detail.get("name"),
        "dealType": detail.get("dealType"),
        "priceLabel": _price_label(detail),
        "address": detail.get("address"),
        "areaLabel": _area_label(detail.get("area")),
        "typeLabel": PROPERTY_TYPE_LABELS.get(detail.get("type"), detail.get("type")),
        "thumbnailUrl": _main_image(detail),
    }

    # 계산/조회가 끝난 최종 결과를 호출한 쪽에 반환함
    return json.dumps(payload, ensure_ascii=False), [card]


# 만원 단위 금액을 "3억 8,000" 같은 사람이 읽는 문구로 바꾸는 함수임
def _money_label(manwon: int | None) -> str | None:
    # 금액이 비어 있는 매물도 있으므로 먼저 확인한다.
    if manwon is None:
        return None

    eok, rest = divmod(int(manwon), 10000)

    # 억과 만원이 모두 있는 경우, 억만 있는 경우, 만원만 있는 경우를 나눠 적는다.
    if eok and rest:
        return f"{eok}억 {rest:,}"

    if eok:
        return f"{eok}억"

    # 계산이 끝난 결과를 호출한 쪽에서 이어서 사용할 수 있도록 반환함.
    return f"{rest:,}"


# 거래 유형에 맞는 금액 칸을 골라 카드에 쓸 금액 문구를 만드는 함수임
def _price_label(detail: dict) -> str | None:
    deal_type = detail.get("dealType")

    # 매매·전세·월세가 각각 다른 칸을 쓰므로 유형별로 나눠서 만든다.
    if deal_type == "SALE":
        label = _money_label(detail.get("price"))
        return f"매매 {label}" if label else None

    if deal_type == "JEONSE":
        label = _money_label(detail.get("deposit"))
        return f"전세 {label}" if label else None

    if deal_type == "MONTHLY":
        deposit = _money_label(detail.get("monthlyDeposit"))
        rent = detail.get("monthlyRent")

        # 월세는 보증금과 월세가 모두 있어야 "1,000/60" 형태를 만들 수 있다.
        if deposit is None or rent is None:
            return None

        return f"월세 {deposit}/{int(rent):,}"

    # 계산이 끝난 결과를 호출한 쪽에서 이어서 사용할 수 있도록 반환함.
    return None


# 전용면적 숫자를 "59㎡" 같은 문구로 바꾸는 함수임
def _area_label(area) -> str | None:
    # 면적이 비어 있는 자료도 있으므로 먼저 확인한다.
    if area is None:
        return None

    # 값이 문자열로 올 수도 있어 숫자로 바꾸다 실패하면 문구를 비운다.
    try:
        value = float(area)
    except (TypeError, ValueError):
        return None

    # 계산이 끝난 결과를 호출한 쪽에서 이어서 사용할 수 있도록 반환함.
    return f"{int(value)}㎡" if value == int(value) else f"{value:.1f}㎡"


# 상세 응답의 사진 목록에서 대표 사진 주소를 찾아 주는 함수임
def _main_image(detail: dict) -> str | None:
    images = detail.get("images") or []
    # 사진이 한 장도 없는 매물이 있으므로 먼저 확인한다.
    if not images:
        return None

    # 대표 사진(isMain)이 있으면 그것을, 없으면 첫 장을 쓴다. 매물 카드와 같은 규칙이다.
    for image in images:
        if image.get("isMain"):
            return image.get("url")

    # 계산/조회가 끝난 최종 결과를 호출한 쪽에 반환함
    return images[0].get("url")


# 도구 이름과 인자를 받아 알맞은 실행 함수로 넘겨 주는 함수임
def run_tool(name: str, arguments: dict, access_token: str | None) -> tuple[str, list[dict]]:
    # 실행 중 어떤 오류가 나도 챗봇이 멈추지 않고, 실패했다는 사실을 LLM에게 알려 사용자에게 설명하게 한다.
    try:
        if name == "search_properties":
            return _run_search(arguments, access_token)

        if name == "get_property_detail":
            return _run_detail(arguments, access_token)

        # OpenAI가 없는 도구 이름을 만들어 내는 경우까지 대비함
        logger.warning("정의되지 않은 도구를 호출했습니다: %s", name)
        return f"'{name}'이라는 기능은 없습니다.", []

    except httpx.HTTPStatusError as error:
        logger.warning("Spring 도구 호출이 실패했습니다: %s", error)
        return f"조회에 실패했습니다. (응답 코드 {error.response.status_code})", []

    except httpx.HTTPError as error:
        logger.warning("Spring 서버에 연결하지 못했습니다: %s", error)
        return "매물 서버에 연결하지 못했습니다.", []

    except (ValueError, KeyError, TypeError) as error:
        logger.warning("도구 결과를 해석하지 못했습니다: %s", error)
        return "조회 결과를 해석하지 못했습니다.", []
