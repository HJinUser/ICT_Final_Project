# 행정동·자치구 공간 Feature 결과 검증

# 파일 경로를 안전하게 조합하기 위해 Path를 사용함
from pathlib import Path

# 공간 Feature CSV를 읽고 구조를 확인하기 위해 pandas를 사용함
import pandas as pd

# checks 폴더의 상위인 prentversal을 프로젝트 기준 경로로 사용함
BASE_DIR = Path(__file__).resolve().parents[1]
# 공간 Feature 결과가 저장되는 processed 폴더임
PROCESSED_DIR = BASE_DIR / "data" / "processed"
# 행정동 단위 공간 Feature 파일 경로임
NEIGHBORHOOD_PATH = PROCESSED_DIR / "neighborhood_features.csv"
# 자치구 단위 가격모델용 공간 Feature 파일 경로임
DISTRICT_PATH = PROCESSED_DIR / "district_features.csv"


# 행정동·자치구 Feature 파일의 존재 여부와 핵심 구조를 검증함
def main() -> None:
    # 발견된 검증 오류를 모아 마지막에 한 번에 출력함
    errors: list[str] = []

    # 두 공간 Feature 파일이 모두 생성되었는지 먼저 확인함
    for path in [NEIGHBORHOOD_PATH, DISTRICT_PATH]:
        # 현재 값이나 상태가 해당 조건에 맞는지 확인한 뒤 필요한 분기 처리를 수행함.
        if not path.exists():
            errors.append(f"파일 없음 - {path}")

    # 입력 파일이 없으면 CSV를 읽을 수 없으므로 즉시 실패 처리함
    if errors:
        # 대상 데이터를 하나씩 순회하면서 각 항목에 동일한 처리 규칙을 적용함.
        for error in errors:
            print("[FAIL]", error)
        raise SystemExit(1)

    # 행정동과 자치구 Feature 결과를 각각 DataFrame으로 불러옴
    neighborhood = pd.read_csv(NEIGHBORHOOD_PATH)
    # 다음 계산에 사용할 입력 데이터를 파일에서 DataFrame으로 불러옴.
    district = pd.read_csv(DISTRICT_PATH)

    # 행정동 결과의 크기와 실제 예시 행을 확인함
    print("[neighborhood_features.csv]")
    print("행/열 개수:", neighborhood.shape)
    print(neighborhood.head())

    # 자치구 결과의 전체 크기를 확인함
    print("\n[district_features.csv]")
    print("행/열 개수:", district.shape)

    # 가격모델에서 실제로 사용하는 대표 자치구 Feature 컬럼을 검사함
    required = [
        "district_name",
        "station_density",
        "hospital_density",
        "academy_density",
    ]
    missing = [column for column in required if column not in district.columns]
    # 현재 값이나 상태가 해당 조건에 맞는지 확인한 뒤 필요한 분기 처리를 수행함.
    if missing:
        errors.append(f"district_features.csv 필수 컬럼 없음 - {missing}")
    else:
        # 필수 컬럼이 모두 있으면 자치구별 주요 밀도값을 직접 확인할 수 있게 출력함
        print(district[required])

    # 공간 Feature 파일이 생성되었어도 0행이면 이후 학습과 군집분석을 진행할 수 없음
    if neighborhood.empty:
        errors.append("neighborhood_features.csv가 0행입니다.")
    # 현재 값이나 상태가 해당 조건에 맞는지 확인한 뒤 필요한 분기 처리를 수행함.
    if district.empty:
        errors.append("district_features.csv가 0행입니다.")

    # 서울 가격모델용 자치구 Feature가 정확히 25개 자치구를 포함하는지 확인함
    if "district_name" in district.columns:
        # 필수값이 없는 행을 제거해 이후 계산이나 학습에 사용할 수 있는 데이터만 남김.
        district_count = district["district_name"].dropna().nunique()
        print(f"\n서울 자치구 개수: {district_count}")
        if district_count != 25:
            errors.append(f"서울 자치구가 25개가 아닙니다: {district_count}개")

    # 하나라도 문제가 발견되면 다음 가격 학습 데이터 생성 단계로 넘어가지 않도록 실패 처리함
    if errors:
        print("\n[FAIL] 공간 Feature 검증에서 문제가 발견되었습니다.")
        # 대상 데이터를 하나씩 순회하면서 각 항목에 동일한 처리 규칙을 적용함.
        for error in errors:
            print("-", error)
        raise SystemExit(1)

    # 모든 기본 검증이 통과하면 정상 메시지를 출력함
    print("\n[PASS] 공간 Feature 기본 검증 완료 / 서울 자치구 25개 확인 완료")


# 이 파일을 직접 실행했을 때만 검증 함수를 호출함
if __name__ == "__main__":
    main()