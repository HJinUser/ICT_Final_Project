# K-Means·Silhouette·군집명 공통 기능
from __future__ import annotations

import pandas as pd
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score
from sklearn.preprocessing import StandardScaler

from collectors.common import BASE_DIR

# 입력·출력 파일 위치를 한 곳에서 재사용할 수 있도록 경로를 미리 정의함.
PROCESSED = BASE_DIR / "data" / "processed"
OUTPUTS = BASE_DIR / "outputs"

DIMENSIONS = [
    "transport_score",
    "living_score",
    "medical_score",
    "education_score",
    "green_score",
]

# 여러 처리에서 공통으로 사용할 설정값을 상수로 미리 정의함.
KOREAN_NAME = {
    "transport_score": "교통",
    "living_score": "생활편의",
    "medical_score": "의료",
    "education_score": "교육",
    "green_score": "녹지",
}


# 원시 시설 밀도를 교통·생활·의료·교육·녹지 5개 생활영역 점수로 묶음
def build_dimensions(df: pd.DataFrame) -> pd.DataFrame:
    out = df.copy()
    out["transport_score"] = out["station_density"] + out["bus_stop_density"]
    out["living_score"] = (
        out["mart_density"] + out["convenience_density"] + out["laundry_density"]
    )
    out["medical_score"] = out["hospital_density"]
    out["education_score"] = out["school_density"] + out["academy_density"]
    out["green_score"] = out["park_density"] + (out["park_area_ratio"] * 10)
    # 계산이 끝난 결과를 호출한 쪽에서 이어서 사용할 수 있도록 반환함.
    return out


# 군집에서 상대적으로 강한 생활영역 두 개를 사람이 읽을 군집명으로 만듦
def make_cluster_name(profile: pd.Series) -> str:
    top = profile.sort_values(ascending=False).index[:2]
    names = [KOREAN_NAME[x] for x in top]
    # 계산이 끝난 결과를 호출한 쪽에서 이어서 사용할 수 있도록 반환함.
    return "·".join(names) + " 중심형"


# K=3~8을 비교해 최적 K-Means 결과와 silhouette/profiles를 동일하게 재현함
def fit_best_kmeans() -> tuple[
    pd.DataFrame,
    dict[int, float],
    int,
    pd.DataFrame,
    dict[int, str],
]:
    # 다음 계산에 사용할 입력 데이터를 파일에서 DataFrame으로 불러옴.
    df = pd.read_csv(PROCESSED / "neighborhood_features.csv")
    df = build_dimensions(df)

    scaler = StandardScaler()
    # 현재 데이터 기준으로 전처리기를 학습하면서 변환 결과까지 한 번에 생성함.
    x = scaler.fit_transform(df[DIMENSIONS])

    silhouette: dict[int, float] = {}
    models: dict[int, KMeans] = {}

    # 대상 데이터를 하나씩 순회하면서 각 항목에 동일한 처리 규칙을 적용함.
    for k in range(3, 9):
        model = KMeans(n_clusters=k, random_state=42, n_init=20)
        labels = model.fit_predict(x)
        score = silhouette_score(x, labels)
        silhouette[k] = float(score)
        models[k] = model
        print(f"k={k}, silhouette={score:.4f}")

    best_k = max(silhouette, key=silhouette.get)
    model = models[best_k]
    df["cluster_id"] = model.labels_

    # 필요한 값만 새 DataFrame 구조로 구성해 이후 처리에서 같은 형태로 사용함.
    scaled_df = pd.DataFrame(x, columns=DIMENSIONS)
    scaled_df["cluster_id"] = df["cluster_id"].to_numpy()
    profiles = scaled_df.groupby("cluster_id")[DIMENSIONS].mean()

    cluster_names = {
        int(cluster_id): make_cluster_name(row)
        for cluster_id, row in profiles.iterrows()
    }
    # 각 행의 값을 미리 정한 변환 규칙에 따라 새로운 값으로 매핑함.
    df["cluster_name"] = df["cluster_id"].map(cluster_names)

    return df, silhouette, int(best_k), profiles, cluster_names