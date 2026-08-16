# SALE 가격예측 모델 학습·저장

# SALE 공통 학습/저장 기능 불러옴
from training.price_training_common import save_pipeline, train_single


# SALE 후보 모델을 비교해 MAE가 낮은 production Pipeline 하나를 저장함
def main() -> None:
    pipeline, metadata = train_single("sale_training.csv", "target_price")
    save_pipeline(pipeline, metadata, "sale_price_pipeline.joblib")


if __name__ == "__main__":
    main()