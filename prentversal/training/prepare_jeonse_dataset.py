# JEONSE 최종 학습 데이터 생성

# 이 파일에서 사용할 프로젝트 공통 데이터셋 생성 기능 불러옴
from training.price_dataset_common import PROCESSED, build_price_dataset

OUTPUT = PROCESSED / "jeonse_training.csv"


# 전세 원본에 자치구 공간 Feature를 붙여 JEONSE 학습용 CSV를 생성함
def main() -> None:
    df = build_price_dataset("jeonse_raw.csv")
    df.to_csv(OUTPUT, index=False, encoding="utf-8-sig")
    print(f"saved: {OUTPUT} / {df.shape}")


if __name__ == "__main__":
    main()