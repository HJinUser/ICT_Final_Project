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


"""
군집명을 붙일 때 "이 영역이 평균보다 뚜렷하게 강하다"고 볼 기준.

점수는 StandardScaler를 거친 표준화값이라 0이 서울 평균이다.
0.3은 표준편차의 약 1/3로, 이 정도는 넘어야 그 영역을 군집의 특징이라고 부를 수 있다.
"""
STRONG_SCORE = 0.3

# 모든 생활영역이 평균 이하인 군집에 붙이는 이름.
# 인프라가 특별히 강한 곳이 없는 저밀도 주거지라는 뜻이다.
QUIET_CLUSTER_NAME = "한적한 주거형"


# 군집에서 평균보다 뚜렷하게 강한 생활영역을 골라 사람이 읽을 군집명으로 만듦
def make_cluster_name(profile: pd.Series) -> str:
    strong = profile[profile >= STRONG_SCORE].sort_values(ascending=False)

    """
    강한 영역이 하나도 없으면 "덜 나쁜 것"으로 이름을 짓지 않는다.

    예전에는 점수를 정렬해 무조건 상위 두 개를 썼는데, 전 영역이 음수인 군집에서도
    가장 덜 낮은 두 개가 뽑혀 "녹지·교육 중심형"처럼 실제와 정반대인 이름이 나왔다.
    (그 군집의 녹지 -0.31, 교육 -0.46으로 둘 다 평균 이하였다)
    """
    # 현재 값이나 상태가 해당 조건에 맞는지 확인한 뒤 필요한 분기 처리를 수행함.
    if strong.empty:
        # 계산이 끝난 결과를 호출한 쪽에서 이어서 사용할 수 있도록 반환함.
        return QUIET_CLUSTER_NAME

    names = [KOREAN_NAME[x] for x in strong.index[:2]]
    # 계산이 끝난 결과를 호출한 쪽에서 이어서 사용할 수 있도록 반환함.
    return ", ".join(names) + " 중심형"


# 군집별 이름을 만들되 같은 이름이 겹치지 않도록 정리해서 반환함
def make_cluster_names(profiles: pd.DataFrame) -> dict[int, str]:
    names = {
        int(cluster_id): make_cluster_name(row)
        for cluster_id, row in profiles.iterrows()
    }

    """
    이름이 겹치면 화면에서 두 군집을 구분할 수 없다.

    K가 커지면 평균 이하인 군집이 여러 개 나와 모두 "한적한 주거형"이 될 수 있어서,
    그때는 상대적으로 덜 약한 영역을 덧붙여 갈라 놓는다.
    """
    duplicated = {
        name for name in names.values()
        if list(names.values()).count(name) > 1
    }

    # 대상 데이터를 하나씩 순회하면서 각 항목에 동일한 처리 규칙을 적용함.
    for cluster_id, name in list(names.items()):
        # 현재 값이나 상태가 해당 조건에 맞는지 확인한 뒤 필요한 분기 처리를 수행함.
        if name in duplicated:
            best = profiles.loc[cluster_id].sort_values(ascending=False).index[0]
            names[cluster_id] = f"{name}({KOREAN_NAME[best]} 우세)"

    # 계산이 끝난 결과를 호출한 쪽에서 이어서 사용할 수 있도록 반환함.
    return names


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

    cluster_names = make_cluster_names(profiles)
    # 각 행의 값을 미리 정한 변환 규칙에 따라 새로운 값으로 매핑함.
    df["cluster_name"] = df["cluster_id"].map(cluster_names)

    return df, silhouette, int(best_k), profiles, cluster_names