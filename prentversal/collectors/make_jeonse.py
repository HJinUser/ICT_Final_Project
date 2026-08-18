# 전월세 원본에서 전세 데이터 분리

# 이 파일에서 사용할 프로젝트 공통 기능 불러옴
from collectors.common import BASE_DIR
from collectors.transaction_common import load_rent_base

# 입력·출력 파일 위치를 한 곳에서 재사용할 수 있도록 경로를 미리 정의함.
OUTPUT = BASE_DIR / "data" / "raw" / "api" / "jeonse_raw.csv"


# 전월세 공통 원본에서 전세 행만 추려 전세 모델용 정답 컬럼으로 저장함
def main() -> None:
    all_rent = load_rent_base()
    jeonse = all_rent[all_rent["rent_type"].eq("전세")].copy()
    jeonse = jeonse[jeonse["deposit"] > 0]
    jeonse = jeonse.rename(columns={"deposit": "target_deposit"})
    jeonse = jeonse.drop(columns=["monthly_rent", "rent_type"])
    # 처리가 끝난 결과를 다음 단계에서 다시 사용할 수 있도록 파일로 저장함.
    jeonse.to_csv(OUTPUT, index=False, encoding="utf-8-sig")
    print(f"saved: {OUTPUT} / {len(jeonse):,} rows")


if __name__ == "__main__":
    main()