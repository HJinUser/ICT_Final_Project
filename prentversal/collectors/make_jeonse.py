# 전월세 원본에서 전세 데이터 분리

# 이 파일에서 사용할 프로젝트 공통 기능 불러옴
from collectors.common import BASE_DIR
from collectors.transaction_common import load_rent_base

OUTPUT = BASE_DIR / "data" / "raw" / "api" / "jeonse_raw.csv"


# 전월세 공통 원본에서 전세 행만 추려 전세 모델용 정답 컬럼으로 저장함
def main() -> None:
    all_rent = load_rent_base()
    jeonse = all_rent[all_rent["rent_type"].eq("전세")].copy()
    jeonse = jeonse[jeonse["deposit"] > 0]
    jeonse = jeonse.rename(columns={"deposit": "target_deposit"})
    jeonse = jeonse.drop(columns=["monthly_rent", "rent_type"])
    jeonse.to_csv(OUTPUT, index=False, encoding="utf-8-sig")
    print(f"saved: {OUTPUT} / {len(jeonse):,} rows")


if __name__ == "__main__":
    main()