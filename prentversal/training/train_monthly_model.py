# MONTHLY 다중출력 모델 학습·저장

# MONTHLY 공통 학습/저장 기능 불러옴
from training.price_training_common import save_pipeline, train_monthly


# 월세 보증금/월세 다중출력 후보를 비교해 combined MAE가 낮은 Pipeline 하나를 저장함
def main() -> None:
    pipeline, metadata = train_monthly()
    save_pipeline(pipeline, metadata, "monthly_price_pipeline.joblib")


if __name__ == "__main__":
    main()