# 텍스트마이닝 키워드 분석 결과 검증

# 동네 키워드 JSON을 읽기 위해 json 모듈을 사용함
import json
# 텍스트 분석 산출물 경로를 프로젝트 기준으로 계산하기 위해 Path를 사용함
from pathlib import Path

# 병합된 한줄평 CSV를 읽기 위해 pandas를 사용함
import pandas as pd

# checks 폴더의 상위인 prentversal을 프로젝트 기준 경로로 사용함
BASE_DIR = Path(__file__).resolve().parents[1]
# 텍스트마이닝에 실제 사용한 병합 corpus 파일임
REVIEWS_PATH = BASE_DIR / "data" / "processed" / "neighborhood_reviews.csv"
# FastAPI와 관리자 화면이 읽는 동네별 대표 키워드 결과임
KEYWORDS_PATH = BASE_DIR / "outputs" / "neighborhood_keywords.json"
# 발표 확인용 선택 산출물이므로 존재 여부만 보여주고 필수로 강제하지 않음
WORDCLOUD_PATH = BASE_DIR / "outputs" / "neighborhood_wordcloud.png"


# 한줄평 병합 결과와 키워드 JSON의 기본 구조를 검증함
def main() -> None:
    errors: list[str] = []

    # 텍스트마이닝 필수 입력/결과 파일이 실제로 생성되었는지 확인함
    if not REVIEWS_PATH.exists():
        errors.append(f"한줄평 병합 파일 없음 - {REVIEWS_PATH}")
    # 현재 값이나 상태가 해당 조건에 맞는지 확인한 뒤 필요한 분기 처리를 수행함.
    if not KEYWORDS_PATH.exists():
        errors.append(f"키워드 결과 파일 없음 - {KEYWORDS_PATH}")

    # 필수 파일이 없으면 읽기 단계로 넘어가지 않고 즉시 실패함
    if errors:
        # 대상 데이터를 하나씩 순회하면서 각 항목에 동일한 처리 규칙을 적용함.
        for error in errors:
            print("[FAIL]", error)
        raise SystemExit(1)

    # 병합 corpus와 최종 키워드 JSON을 각각 읽음
    reviews = pd.read_csv(REVIEWS_PATH)
    # 파일을 안전하게 열고 블록이 끝나면 자동으로 닫히도록 처리함.
    with open(KEYWORDS_PATH, encoding="utf-8") as file:
        keywords = json.load(file)

    # JSON에 기록된 전체 문서 수·분석 동네 수·동네별 결과를 꺼냄
    document_count = int(keywords.get("document_count", 0))
    neighborhood_count = int(keywords.get("neighborhood_count", 0))
    neighborhoods = keywords.get("neighborhoods", {})

    # 실제 병합 행 수와 JSON metadata를 비교하기 쉽게 출력함
    print("병합 한줄평 행 수:", len(reviews))
    print("document_count:", document_count)
    print("neighborhood_count:", neighborhood_count)
    print("WordCloud 존재 여부(선택):", WORDCLOUD_PATH.exists())

    # 분석에 사용할 문서나 키워드 결과가 비어 있는 비정상 상태를 검사함
    if reviews.empty:
        errors.append("neighborhood_reviews.csv가 0행입니다.")
    # 현재 값이나 상태가 해당 조건에 맞는지 확인한 뒤 필요한 분기 처리를 수행함.
    if document_count <= 0:
        errors.append("document_count가 0입니다.")
    if neighborhood_count <= 0:
        errors.append("neighborhood_count가 0입니다.")
    # 현재 값이나 상태가 해당 조건에 맞는지 확인한 뒤 필요한 분기 처리를 수행함.
    if not neighborhoods:
        errors.append("동네별 keywords 결과가 비어 있습니다.")

    # 전체 JSON을 길게 출력하는 대신 앞쪽 동네 3개의 대표 키워드만 예시로 확인함
    print("\n키워드 결과 예시")
    # 대상 데이터를 하나씩 순회하면서 각 항목에 동일한 처리 규칙을 적용함.
    for admin_name, result in list(neighborhoods.items())[:3]:
        print(admin_name, "->", result.get("keywords", [])[:5])

    # 필수 텍스트 결과에 문제가 있으면 실패 처리함. WordCloud는 선택이라 실패 조건에 넣지 않음
    if errors:
        print("\n[FAIL] 텍스트마이닝 결과 검증에서 문제가 발견되었습니다.")
        # 대상 데이터를 하나씩 순회하면서 각 항목에 동일한 처리 규칙을 적용함.
        for error in errors:
            print("-", error)
        raise SystemExit(1)

    # 필수 텍스트마이닝 산출물이 정상일 때 통과 메시지를 출력함
    print("\n[PASS] 텍스트마이닝 결과 기본 검증 완료")


# 이 파일을 직접 실행했을 때만 검증 함수를 호출함
if __name__ == "__main__":
    main()