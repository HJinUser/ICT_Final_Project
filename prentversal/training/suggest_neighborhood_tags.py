# 한줄평 키워드로 동네 태그 후보 추천

# 이 파일에서 사용할 표준 모듈과 프로젝트 경로 불러옴
import json
from datetime import datetime

from collectors.common import BASE_DIR

OUTPUTS = BASE_DIR / "outputs"
KEYWORD_PATH = OUTPUTS / "neighborhood_keywords.json"
OUTPUT = OUTPUTS / "neighborhood_tag_suggestions.json"

"""
키워드 -> 태그 매핑 규칙.

왼쪽 태그 이름은 Spring tags 테이블의 name 과 글자까지 같아야 한다.
Spring 이 이름으로 태그를 찾아 붙이고, 못 찾은 이름은 건너뛰며 로그를 남긴다.

positive : 이 낱말이 한줄평에 나오면 그 태그를 후보로 올린다.
negative : 이 낱말이 나오면 후보에서 뺀다. 반대되는 말이 있는데 태그를 붙이면 안 되기 때문이다.
           (예: "시끄럽"이 나온 동네에 '조용한 분위기'를 붙이면 한줄평과 정반대가 된다)

낱말은 부분 일치가 아니라 정확히 같을 때만 센다. 형태소 분석이 이미 낱말을 잘라 두었고,
부분 일치를 허용하면 "편의시설"의 '편의'가 '편의점 근처'에 걸리는 식의 오탐이 생긴다.
실제로 '편의'는 24개 동네에 나오지만 전부 편의시설이지 편의점이 아니라서, '편의점 근처'는
매핑에서 아예 뺐다.

여기에 없는 태그(엘리베이터, 풀옵션, 남향, 즉시 입주 등)는 집 한 채의 속성이라
동네 한줄평으로는 판단할 수 없어 넣지 않았다.
"""
TAG_RULES: dict[str, dict[str, set[str]]] = {
    "한강뷰": {
        "positive": {"한강"},
        "negative": set(),
    },
    # '나무'는 뺐다. 나무가 많다는 말이 공원이 가깝다는 뜻은 아니라서, 이 낱말만 보고 붙이면
    # 6개 동네가 근거 없이 '공원 인근'이 된다.
    "공원 인근": {
        "positive": {"공원", "산책", "숲길", "호수"},
        "negative": set(),
    },
    "지하철역 도보 5분": {
        "positive": {
            "지하철역", "지하철", "서울대입구역",
            "1호선", "2호선", "4호선", "9호선", "경의선",
        },
        "negative": set(),
    },
    "버스정류장 인근": {
        "positive": {"버스"},
        "negative": set(),
    },
    "조용한 분위기": {
        "positive": {"평화", "주거"},
        "negative": {"시끄럽", "번화가", "활기차", "상권", "대학가"},
    },
    # '아이'는 뺐다. 아이를 언급했다고 교육열이 높은 동네라고 볼 수는 없다.
    "교육열 높음": {
        "positive": {"학원가", "학원"},
        "negative": set(),
    },
    "젊은층 선호": {
        "positive": {"대학가", "대학교", "서울대", "숙대", "활기차", "번화가", "카페"},
        "negative": set(),
    },
    "마트 근처": {
        "positive": {"마트", "시장", "쇼핑몰"},
        "negative": set(),
    },
    "병원 근처": {
        "positive": {"병원"},
        "negative": set(),
    },
    "학원가": {
        "positive": {"학원가", "학원"},
        "negative": set(),
    },
    "높은 치안": {
        "positive": {"안전"},
        "negative": {"무섭"},
    },
    # 반대 증거만 있는 태그다. 한줄평으로 "냄새가 없다"를 확인할 방법은 없고
    # "냄새가 난다"만 확인할 수 있어서, 후보로 올리지는 않고 막기만 한다.
    "냄새 적음": {
        "positive": set(),
        "negative": {"냄새", "쓰레기", "하수도"},
    },
}


# 한 동네의 키워드 목록에서 근거가 되는 낱말을 찾아 태그 후보 하나를 만드는 함수임
def match_tag(tag_name: str, rule: dict[str, set[str]], keywords: set[str]) -> dict | None:
    blocked = sorted(rule["negative"] & keywords)
    # 반대되는 말이 하나라도 있으면 이 태그는 후보로 올리지 않음
    if blocked:
        # 계산/조회가 끝난 최종 결과를 호출한 쪽에 반환함
        return None

    evidence = sorted(rule["positive"] & keywords)
    # 근거가 되는 낱말이 하나도 없으면 후보가 아님
    if not evidence:
        # 계산/조회가 끝난 최종 결과를 호출한 쪽에 반환함
        return None

    # 계산/조회가 끝난 최종 결과를 호출한 쪽에 반환함
    return {
        "tagName": tag_name,
        "evidence": evidence,
        # 근거 낱말이 여러 개면 그만큼 확신이 높다고 본다. 확률이 아니라 정렬용 값이다.
        "matchCount": len(evidence),
    }


# 행정동별 대표 키워드를 태그 후보로 바꿔 JSON 하나를 생성함
def main() -> None:
    # 파일을 안전하게 열고 블록이 끝나면 자동으로 닫히도록 처리함.
    with open(KEYWORD_PATH, encoding="utf-8") as f:
        source = json.load(f)

    results: dict[str, dict] = {}

    # 대상 데이터를 하나씩 순회하면서 각 항목에 동일한 처리 규칙을 적용함.
    for admin_code, entry in source.get("neighborhoods", {}).items():
        keywords = {item["keyword"] for item in entry.get("keywords", [])}

        suggestions = []
        for tag_name, rule in TAG_RULES.items():
            matched = match_tag(tag_name, rule, keywords)
            if matched is not None:
                suggestions.append(matched)

        # 후보가 하나도 없는 동네는 관리자 화면에 띄울 것이 없으므로 넣지 않음
        if not suggestions:
            continue

        suggestions.sort(key=lambda x: (-x["matchCount"], x["tagName"]))

        results[str(admin_code)] = {
            "adminName": entry.get("adminName"),
            "districtName": entry.get("districtName"),
            # 근거가 된 한줄평 수. 1건이면 한 사람 의견이라는 뜻이라 관리자가 감안해서 봐야 한다.
            "documentCount": int(entry.get("documentCount", 0)),
            "suggestions": suggestions,
        }

    payload = {
        "analyzed_at": datetime.now().isoformat(timespec="seconds"),
        "source_analyzed_at": source.get("analyzed_at"),
        "neighborhood_count": len(results),
        "suggestion_count": sum(len(v["suggestions"]) for v in results.values()),
        "neighborhoods": results,
    }

    # 처리가 끝난 결과를 다음 단계에서 다시 사용할 수 있도록 파일로 저장함.
    with open(OUTPUT, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)

    print(json.dumps(
        {key: payload[key] for key in payload if key != "neighborhoods"},
        ensure_ascii=False,
        indent=2,
    ))
    print(f"saved: {OUTPUT}")


if __name__ == "__main__":
    main()
