# 행정동 단위 공간 Feature 생성

# 이 파일에서 사용할 프로젝트 공통 공간 Feature 기능 불러옴
from training.spatial_common import PROCESSED, build_neighborhood_feature_frame

OUTPUT = PROCESSED / "neighborhood_features.csv"


# 지하철·버스·병원·학교·공원·상가를 행정동 단위 Feature로 집계해 저장함
def main() -> None:
    PROCESSED.mkdir(parents=True, exist_ok=True)
    feature = build_neighborhood_feature_frame()
    feature.to_csv(OUTPUT, index=False, encoding="utf-8-sig")
    print(f"saved: {OUTPUT} / {feature.shape}")


if __name__ == "__main__":
    main()