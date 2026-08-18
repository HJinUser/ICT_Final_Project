# 행정동 K-Means 군집 결과 생성
# K-Means 공통 계산 기능 불러옴
from training.clustering_common import DIMENSIONS, OUTPUTS, fit_best_kmeans

# 입력·출력 파일 위치를 한 곳에서 재사용할 수 있도록 경로를 미리 정의함.
OUTPUT = OUTPUTS / "neighborhood_clusters.csv"


# 최적 K로 행정동별 cluster_id/cluster_name을 계산해 CSV 하나로 저장함
def main() -> None:
    # 저장할 상위 폴더가 없어도 실행될 수 있도록 필요한 디렉터리를 먼저 생성함.
    OUTPUTS.mkdir(parents=True, exist_ok=True)
    df, silhouette, best_k, _, _ = fit_best_kmeans()

    # 다음 metadata 생성 단계가 같은 K-Means 결과를 그대로 재사용하도록 선택 K/실루엣을 CSV에 기록함
    df["selected_k"] = best_k
    # 대상 데이터를 하나씩 순회하면서 각 항목에 동일한 처리 규칙을 적용함.
    for k, score in silhouette.items():
        df[f"silhouette_k{k}"] = score

    result_cols = [
        "admin_code", "admin_name", "district_name",
        *DIMENSIONS,
        "cluster_id", "cluster_name",
        "selected_k",
        *[f"silhouette_k{k}" for k in range(3, 9)],
    ]
    # 처리가 끝난 결과를 다음 단계에서 다시 사용할 수 있도록 파일로 저장함.
    df[result_cols].to_csv(OUTPUT, index=False, encoding="utf-8-sig")
    print(f"selected k={best_k}")
    print(f"saved: {OUTPUT}")


if __name__ == "__main__":
    main()