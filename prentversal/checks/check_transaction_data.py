# 매매·전세·월세 정리 데이터 검증!

# 파일 경로를 운영체제에 맞게 안전하게 다루기 위해 Path를 사용함
from pathlib import Path

# 거래유형별 CSV를 읽고 구조와 결측값을 확인하기 위해 pandas를 사용함
import pandas as pd

# 현재 checks 폴더의 한 단계 위인 prentversal을 프로젝트 기준 경로로 잡음
BASE_DIR = Path(__file__).resolve().parents[1]
# 거래유형별 정리 CSV가 저장되는 공통 폴더 경로임
API_DIR = BASE_DIR / "data" / "raw" / "api"

# 거래유형마다 검사할 파일과 반드시 있어야 하는 핵심 컬럼을 정의함
FILES = {
    "sale": {
        "path": API_DIR / "sale_raw.csv",
        "required": ["property_type", "district_name", "area", "target_price"],
    },
    "jeonse": {
        "path": API_DIR / "jeonse_raw.csv",
        "required": ["property_type", "district_name", "area", "target_deposit"],
    },
    "monthly": {
        "path": API_DIR / "monthly_raw.csv",
        "required": [
            "property_type",
            "district_name",
            "area",
            "target_deposit",
            "target_monthly_rent",
        ],
    },
}


# 매매·전세·월세 정리 파일을 순서대로 읽고 기본 데이터 품질을 한 번에 검증함
def main() -> None:
    # 발견된 문제를 모두 모아 마지막에 한꺼번에 보여주기 위한 목록임
    errors: list[str] = []

    # 세 거래유형을 같은 기준으로 반복 검사함
    for name, config in FILES.items():
        path = config["path"]
        required = config["required"]

        # 어떤 거래유형을 검사 중인지 구분하기 쉽게 화면에 표시함
        print("=" * 80)
        print(f"[{name.upper()}] {path}")

        # 파일 자체가 없으면 다음 검사를 진행할 수 없으므로 오류로 기록하고 다음 유형으로 넘어감
        if not path.exists():
            errors.append(f"{name}: 파일 없음 - {path}")
            print("[FAIL] 파일이 없습니다.")
            continue

        # 실거래가 파일은 컬럼 형식이 섞일 수 있으므로 low_memory=False로 전체 구조를 안정적으로 읽음
        df = pd.read_csv(path, low_memory=False)
        print("행/열 개수:", df.shape)
        print("\n상위 5개 행")
        print(df.head())
        print("\n컬럼별 결측 개수")
        print(df.isnull().sum())

        # 파일은 존재하지만 실제 데이터가 하나도 없으면 정상 결과로 볼 수 없음
        if df.empty:
            errors.append(f"{name}: 데이터가 0행입니다.")

        # 해당 거래유형의 모델 학습에 필요한 핵심 컬럼이 빠졌는지 확인함
        missing = [column for column in required if column not in df.columns]
        # 현재 값이나 상태가 해당 조건에 맞는지 확인한 뒤 필요한 분기 처리를 수행함.
        if missing:
            errors.append(f"{name}: 필수 컬럼 없음 - {missing}")
            # 컬럼이 없으면 아래 결측 검사를 수행할 수 없으므로 다음 거래유형으로 넘어감
            continue

        # 필수 컬럼이 존재하더라도 값 전체가 비어 있으면 학습에 사용할 수 없으므로 오류로 처리함
        for column in required:
            # 현재 값이나 상태가 해당 조건에 맞는지 확인한 뒤 필요한 분기 처리를 수행함.
            if df[column].isna().all():
                errors.append(f"{name}: {column} 컬럼이 전부 결측입니다.")

    print("=" * 80)
    # 한 가지라도 문제가 있으면 실패 내용을 모두 출력하고 종료코드 1로 끝냄
    if errors:
        print("[FAIL] 거래유형별 원본 검증에서 문제가 발견되었습니다.")
        # 대상 데이터를 하나씩 순회하면서 각 항목에 동일한 처리 규칙을 적용함.
        for error in errors:
            print("-", error)
        raise SystemExit(1)

    # 모든 파일과 필수 컬럼이 정상인 경우 다음 단계로 넘어갈 수 있음을 알려줌
    print("[PASS] 거래유형별 원본의 기본 검증이 완료되었습니다.")
    print("MONTHLY의 정답 y는 target_deposit, target_monthly_rent 두 개입니다.")


# 이 파일을 직접 실행했을 때만 검증 진입 함수가 동작하도록 함
if __name__ == "__main__":
    main()