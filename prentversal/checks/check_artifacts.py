# FastAPI 운영에 필요한 최종 산출물 전체 검증

# FastAPI 운영 산출물의 실제 파일 경로를 프로젝트 기준으로 확인하기 위해 Path를 사용함
from pathlib import Path

# checks 폴더의 상위인 prentversal을 프로젝트 기준 경로로 잡음
BASE_DIR = Path(__file__).resolve().parents[1]

# FastAPI 추론과 동네 분석 기능을 실행하기 위해 반드시 필요한 핵심 산출물 목록임
REQUIRED = [
    "models/sale_price_pipeline.joblib",
    "models/jeonse_price_pipeline.joblib",
    "models/monthly_price_pipeline.joblib",
    "models/price_metadata.json",
    "data/reference/subway_stations.csv",
    "data/reference/bus_stops.csv",
    "data/reference/hospitals.csv",
    "data/reference/schools.csv",
    "data/reference/parks.csv",
    "data/reference/commercial_pois.csv",
    "data/processed/neighborhood_features.csv",
    "data/processed/district_features.csv",
    "outputs/neighborhood_clusters.csv",
    "outputs/cluster_profiles.json",
    "outputs/neighborhood_keywords.json",
]


# FastAPI 실행 직전에 핵심 모델·데이터·분석 산출물의 누락 여부를 한 번에 확인함
def main() -> None:
    # 없는 파일의 상대경로를 모아 마지막에 한꺼번에 보여주기 위한 목록임
    missing: list[str] = []

    print("최종 핵심 산출물 확인")
    print("=" * 80)

    # 필수 산출물 목록을 하나씩 실제 프로젝트 경로와 결합해 존재 여부를 검사함
    for relative_path in REQUIRED:
        path = BASE_DIR / relative_path
        # 현재 값이나 상태가 해당 조건에 맞는지 확인한 뒤 필요한 분기 처리를 수행함.
        if path.exists():
            print(f"[OK]   {relative_path}")
        else:
            print(f"[MISS] {relative_path}")
            missing.append(relative_path)

    print("=" * 80)
    # 누락 파일이 하나라도 있으면 FastAPI 실행 전에 원인을 확인하도록 실패 처리함
    if missing:
        print(f"[FAIL] 누락된 필수 산출물: {len(missing)}개")
        # 대상 데이터를 하나씩 순회하면서 각 항목에 동일한 처리 규칙을 적용함.
        for path in missing:
            print("-", path)
        raise SystemExit(1)

    # 모든 핵심 산출물이 존재하면 FastAPI/pytest 단계로 넘어갈 수 있음
    print("[PASS] FastAPI 실행 전 핵심 산출물이 모두 존재합니다.")


# 이 파일을 직접 실행했을 때만 검증 함수를 호출함
if __name__ == "__main__":
    main()