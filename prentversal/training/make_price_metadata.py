# 세 가격모델 성능 metadata JSON 생성

# 이 파일에서 사용할 표준/외부 모듈과 저장 모델 기능 불러옴
import json
from datetime import datetime

import joblib

from training.price_training_common import FEATURES, MODELS

OUTPUT = MODELS / "price_metadata.json"


# 저장된 Pipeline 내부의 학습/평가 metadata를 읽음
def load_metadata(file_name: str) -> dict:
    pipeline = joblib.load(MODELS / file_name)
    metadata = getattr(pipeline, "rentversal_metadata_", None)
    if metadata is None:
        raise RuntimeError(f"모델 내부 metadata가 없습니다: {file_name}")
    return metadata


# SALE/JEONSE/MONTHLY의 모델명·행수·평가지표를 기존 FastAPI용 JSON 하나로 합침
def main() -> None:
    metadata = {
        "version": datetime.now().strftime("price-%Y%m%d-%H%M"),
        "trained_at": datetime.now().isoformat(timespec="seconds"),
        "feature_columns": FEATURES,
        "currency_unit": "만원",
        "sale": load_metadata("sale_price_pipeline.joblib"),
        "jeonse": load_metadata("jeonse_price_pipeline.joblib"),
        "monthly": load_metadata("monthly_price_pipeline.joblib"),
    }

    with open(OUTPUT, "w", encoding="utf-8") as f:
        json.dump(metadata, f, ensure_ascii=False, indent=2)

    print(json.dumps(metadata, ensure_ascii=False, indent=2))
    print(f"saved: {OUTPUT}")


if __name__ == "__main__":
    main()