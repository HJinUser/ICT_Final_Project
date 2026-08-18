# 군집별 특성·Silhouette metadata 생성
# 이 파일에서 사용할 표준/외부 모듈과 K-Means 공통 상수 불러옴
import json
from datetime import datetime

import pandas as pd
from sklearn.preprocessing import StandardScaler

from training.clustering_common import DIMENSIONS, OUTPUTS

# 입력·출력 파일 위치를 한 곳에서 재사용할 수 있도록 경로를 미리 정의함.
INPUT = OUTPUTS / "neighborhood_clusters.csv"
OUTPUT = OUTPUTS / "cluster_profiles.json"


# 앞 단계의 확정 cluster_id를 다시 사용해 선택 K·silhouette·군집 프로필 JSON을 생성함
def main() -> None:
    # 저장할 상위 폴더가 없어도 실행될 수 있도록 필요한 디렉터리를 먼저 생성함.
    OUTPUTS.mkdir(parents=True, exist_ok=True)
    df = pd.read_csv(INPUT)
    if df.empty:
        raise RuntimeError(f"군집 결과가 비어 있습니다: {INPUT}")

    best_k = int(df["selected_k"].iloc[0])
    silhouette = {
        k: float(df[f"silhouette_k{k}"].iloc[0])
        for k in range(3, 9)
    }

    # 원래 군집 프로필과 같은 기준을 유지하도록 생활영역 점수를 다시 StandardScaler로 변환함
    x = StandardScaler().fit_transform(df[DIMENSIONS])
    # 필요한 값만 새 DataFrame 구조로 구성해 이후 처리에서 같은 형태로 사용함.
    scaled_df = pd.DataFrame(x, columns=DIMENSIONS)
    scaled_df["cluster_id"] = df["cluster_id"].to_numpy()
    profiles = scaled_df.groupby("cluster_id")[DIMENSIONS].mean()

    cluster_names = (
        df[["cluster_id", "cluster_name"]]
        .drop_duplicates(subset=["cluster_id"])
        .set_index("cluster_id")["cluster_name"]
        .to_dict()
    )

    profile_output = {
        str(int(idx)): {
            "name": str(cluster_names[int(idx)]),
            "scores": {key: float(value) for key, value in row.items()},
        }
        for idx, row in profiles.iterrows()
    }

    metadata = {
        "analyzed_at": datetime.now().isoformat(timespec="seconds"),
        "neighborhood_count": int(len(df)),
        "selected_k": best_k,
        "silhouette_scores": {str(k): score for k, score in silhouette.items()},
        "cluster_profiles": profile_output,
    }

    # 파일을 안전하게 열고 블록이 끝나면 자동으로 닫히도록 처리함.
    with open(OUTPUT, "w", encoding="utf-8") as f:
        json.dump(metadata, f, ensure_ascii=False, indent=2)

    print(json.dumps(metadata, ensure_ascii=False, indent=2))
    print(f"saved: {OUTPUT}")


if __name__ == "__main__":
    main()