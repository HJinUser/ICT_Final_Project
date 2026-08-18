# K-Means 군집 결과·Silhouette 결과 검증

# 군집 프로필 metadata JSON을 읽기 위해 json 모듈을 사용함
import json
# K-Means 결과 파일 경로를 계산하기 위해 Path를 사용함
from pathlib import Path

# 행정동별 군집 결과 CSV를 확인하기 위해 pandas를 사용함
import pandas as pd

# outputs 폴더를 프로젝트 기준으로 찾음
BASE_DIR = Path(__file__).resolve().parents[1]
# 입력·출력 파일 위치를 한 곳에서 재사용할 수 있도록 경로를 미리 정의함.
OUTPUTS_DIR = BASE_DIR / "outputs"
# 행정동별 실제 군집 배정 결과 파일임
CLUSTERS_PATH = OUTPUTS_DIR / "neighborhood_clusters.csv"
# 선택 K와 군집 프로필을 저장한 metadata 파일임
PROFILES_PATH = OUTPUTS_DIR / "cluster_profiles.json"


# K-Means 결과 CSV와 metadata JSON이 같은 분석 결과를 담는지 기본 검증함
def main() -> None:
    errors: list[str] = []

    # 군집 결과와 군집 metadata 두 파일이 모두 생성되었는지 먼저 확인함
    if not CLUSTERS_PATH.exists():
        errors.append(f"군집 결과 파일 없음 - {CLUSTERS_PATH}")
    # 현재 값이나 상태가 해당 조건에 맞는지 확인한 뒤 필요한 분기 처리를 수행함.
    if not PROFILES_PATH.exists():
        errors.append(f"군집 프로필 파일 없음 - {PROFILES_PATH}")

    # 필수 산출물이 없으면 이후 검사를 수행할 수 없으므로 바로 실패 처리함
    if errors:
        # 대상 데이터를 하나씩 순회하면서 각 항목에 동일한 처리 규칙을 적용함.
        for error in errors:
            print("[FAIL]", error)
        raise SystemExit(1)

    # CSV와 JSON을 각각 읽어 실제 분석 결과를 확인함
    clusters = pd.read_csv(CLUSTERS_PATH)
    # 파일을 안전하게 열고 블록이 끝나면 자동으로 닫히도록 처리함.
    with open(PROFILES_PATH, encoding="utf-8") as file:
        profiles = json.load(file)

    # 행정동 군집 결과가 한 행도 없으면 정상 분석 결과가 아님
    if clusters.empty:
        errors.append("neighborhood_clusters.csv가 0행입니다.")

    # 각 행정동의 군집 ID/이름과 선택된 K가 저장되었는지 확인함
    required = ["cluster_id", "cluster_name", "selected_k"]
    missing = [column for column in required if column not in clusters.columns]
    # 현재 값이나 상태가 해당 조건에 맞는지 확인한 뒤 필요한 분기 처리를 수행함.
    if missing:
        errors.append(f"군집 결과 필수 컬럼 없음 - {missing}")

    # K=3~8 비교 결과가 모두 CSV에 남아 있는지 확인함
    silhouette_columns = [f"silhouette_k{k}" for k in range(3, 9)]
    missing_silhouette = [
        column for column in silhouette_columns if column not in clusters.columns
    ]
    # 현재 값이나 상태가 해당 조건에 맞는지 확인한 뒤 필요한 분기 처리를 수행함.
    if missing_silhouette:
        errors.append(f"Silhouette 컬럼 없음 - {missing_silhouette}")

    # 선택 K가 정상 범위인지 확인하고 K별 Silhouette Score를 출력함
    if not clusters.empty and "selected_k" in clusters.columns:
        selected_k = int(clusters["selected_k"].iloc[0])
        print("selected_k:", selected_k)
        # 현재 값이나 상태가 해당 조건에 맞는지 확인한 뒤 필요한 분기 처리를 수행함.
        if selected_k not in range(3, 9):
            errors.append(f"selected_k가 3~8 범위가 아닙니다: {selected_k}")

        if not missing_silhouette:
            print("\nK별 Silhouette Score")
            # 대상 데이터를 하나씩 순회하면서 각 항목에 동일한 처리 규칙을 적용함.
            for k in range(3, 9):
                print(f"K={k}: {clusters[f'silhouette_k{k}'].iloc[0]}")

    # 실제 생성된 군집 ID와 사람이 읽는 군집 이름 조합을 중복 없이 출력함
    if "cluster_id" in clusters.columns and "cluster_name" in clusters.columns:
        summary = (
            clusters[["cluster_id", "cluster_name"]]
            .drop_duplicates()
            .sort_values("cluster_id")
        )
        print("\n군집 ID / 이름")
        print(summary.to_string(index=False))

    # 관리자 상태 API가 읽는 metadata의 선택 K와 분석 행정동 수도 함께 확인함
    print("\ncluster_profiles.json selected_k:", profiles.get("selected_k"))
    print("neighborhood_count:", profiles.get("neighborhood_count"))

    # 하나라도 구조 문제가 있으면 실패 내용을 모두 보여주고 종료함
    if errors:
        print("\n[FAIL] K-Means 결과 검증에서 문제가 발견되었습니다.")
        # 대상 데이터를 하나씩 순회하면서 각 항목에 동일한 처리 규칙을 적용함.
        for error in errors:
            print("-", error)
        raise SystemExit(1)

    # 기본 검증이 모두 통과하면 다음 텍스트마이닝/통합 단계로 진행할 수 있음
    print("\n[PASS] K-Means 결과 기본 검증 완료")


# 이 파일을 직접 실행했을 때만 검증 함수를 호출함
if __name__ == "__main__":
    main()