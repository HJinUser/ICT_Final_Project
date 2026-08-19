# 행정동별 대표 키워드 분석

# 행정동별 대표 키워드 분석

# 이 파일에서 사용할 표준 모듈과 텍스트 공통 기능 불러옴
import json
from datetime import datetime

from training.text_common import OUTPUTS, load_tokenized_reviews, top_keywords

# 입력·출력 파일 위치를 한 곳에서 재사용할 수 있도록 경로를 미리 정의함.
OUTPUT = OUTPUTS / "neighborhood_keywords.json"


# 병합된 한줄평을 행정동 코드별로 분석해 대표 키워드 JSON 하나를 생성함
def main() -> None:
    # 저장할 상위 폴더가 없어도 실행될 수 있도록 필요한 디렉터리를 먼저 생성함.
    OUTPUTS.mkdir(parents=True, exist_ok=True)
    df = load_tokenized_reviews()

    results: dict[str, dict] = {}
    # 대상 데이터를 하나씩 순회하면서 각 항목에 동일한 처리 규칙을 적용함.
    for admin_code, group in df.groupby("admin_code"):
        top = top_keywords(group)
        if not top:
            continue

        results[str(admin_code)] = {
            "adminName": str(group.iloc[0]["admin_name"]),
            "districtName": str(group.iloc[0]["district_name"]),
            "documentCount": int(len(group)),
            "keywords": top,
        }

    payload = {
        "analyzed_at": datetime.now().isoformat(timespec="seconds"),
        "document_count": int(len(df)),
        "neighborhood_count": int(len(results)),
        "neighborhoods": results,
    }

    # 파일을 안전하게 열고 블록이 끝나면 자동으로 닫히도록 처리함.
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