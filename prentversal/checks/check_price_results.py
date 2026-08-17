# 가격모델 학습 결과·성능·예측 결과 검증

# 저장된 가격모델 metadata JSON을 읽기 위해 json 모듈을 사용함
import json
# 모델과 metadata 파일의 위치를 안전하게 계산하기 위해 Path를 사용함
from pathlib import Path

# 프로젝트 기준 경로와 models 폴더를 정의함
BASE_DIR = Path(__file__).resolve().parents[1]
# 입력·출력 파일 위치를 한 곳에서 재사용할 수 있도록 경로를 미리 정의함.
MODELS_DIR = BASE_DIR / "models"
# 세 가격모델의 평가정보를 합친 metadata 파일 경로임
METADATA_PATH = MODELS_DIR / "price_metadata.json"

# FastAPI가 실제 추론에 사용하는 세 production 모델 파일 목록임
MODEL_FILES = [
    "sale_price_pipeline.joblib",
    "jeonse_price_pipeline.joblib",
    "monthly_price_pipeline.joblib",
]


# 거래유형 한 개의 학습행 수와 평가 지표를 사람이 읽기 쉽게 출력함
def print_single(name: str, data: dict) -> None:
    print(f"\n[{name}]")
    print("selected_model:", data.get("selected_model"))
    print("rows:", data.get("rows"))
    print("train_rows:", data.get("train_rows"))
    print("test_rows:", data.get("test_rows"))

    # metadata에서 최종 선택 모델의 평가 지표 영역을 꺼냄
    metrics = data.get("metrics", {})
    # SALE과 JEONSE는 정답이 하나이므로 MAE/RMSE/R²를 한 세트만 출력함
    if name != "MONTHLY":
        print("MAE:", metrics.get("mae"))
        print("RMSE:", metrics.get("rmse"))
        print("R²:", metrics.get("r2"))
        # 계산이 끝난 결과를 호출한 쪽에서 이어서 사용할 수 있도록 반환함.
        return

    # MONTHLY는 보증금과 월세 두 정답을 함께 예측하므로 지표를 따로 확인함
    deposit = metrics.get("deposit", {})
    rent = metrics.get("rent", {})
    print("보증금 MAE:", deposit.get("mae"))
    print("보증금 RMSE:", deposit.get("rmse"))
    print("보증금 R²:", deposit.get("r2"))
    print("월세 MAE:", rent.get("mae"))
    print("월세 RMSE:", rent.get("rmse"))
    print("월세 R²:", rent.get("r2"))
    print("combined_mae:", metrics.get("combined_mae"))


# 모델 파일과 metadata가 모두 존재하고 metadata 구조가 정상인지 검증함
def main() -> None:
    errors: list[str] = []

    # SALE/JEONSE/MONTHLY production 모델 파일이 모두 저장되었는지 확인함
    for file_name in MODEL_FILES:
        path = MODELS_DIR / file_name
        # 현재 값이나 상태가 해당 조건에 맞는지 확인한 뒤 필요한 분기 처리를 수행함.
        if not path.exists():
            errors.append(f"모델 파일 없음 - {path}")

    # 관리자 상태와 FastAPI 모델 버전에 사용하는 metadata 파일도 필수로 확인함
    if not METADATA_PATH.exists():
        errors.append(f"metadata 파일 없음 - {METADATA_PATH}")

    # 필수 파일이 누락된 경우 JSON을 읽기 전에 실패 처리함
    if errors:
        # 대상 데이터를 하나씩 순회하면서 각 항목에 동일한 처리 규칙을 적용함.
        for error in errors:
            print("[FAIL]", error)
        raise SystemExit(1)

    # 가격모델 metadata JSON을 UTF-8로 읽음
    with open(METADATA_PATH, encoding="utf-8") as file:
        metadata = json.load(file)

    # 모델 전체 버전과 학습시각, 금액단위를 먼저 확인함
    print("model version:", metadata.get("version"))
    print("trained_at:", metadata.get("trained_at"))
    print("currency_unit:", metadata.get("currency_unit"))

    # 세 거래유형의 metadata가 각각 들어 있는지 확인하고 성능을 출력함
    for key, label in [
        ("sale", "SALE"),
        ("jeonse", "JEONSE"),
        ("monthly", "MONTHLY"),
    ]:
        # 현재 값이나 상태가 해당 조건에 맞는지 확인한 뒤 필요한 분기 처리를 수행함.
        if key not in metadata:
            errors.append(f"price_metadata.json에 {key} 항목이 없습니다.")
            continue
        print_single(label, metadata[key])

    # metadata 구조에 문제가 있으면 실패 목록을 출력하고 종료함
    if errors:
        print("\n[FAIL] 가격모델 결과 검증에서 문제가 발견되었습니다.")
        # 대상 데이터를 하나씩 순회하면서 각 항목에 동일한 처리 규칙을 적용함.
        for error in errors:
            print("-", error)
        raise SystemExit(1)

    # 파일과 metadata 구조가 모두 정상일 때 최종 통과 메시지를 출력함
    print("\n[PASS] 가격모델 파일과 metadata 기본 검증 완료")
    print("MAE와 R²는 발표용 성능 기록에 함께 보관합니다.")


# 이 파일을 직접 실행했을 때만 검증 함수를 호출함
if __name__ == "__main__":
    main()