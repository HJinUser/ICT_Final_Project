# 전월세 원본에서 월세 데이터 분리

# 이 파일에서 사용할 프로젝트 공통 기능 불러옴
from collectors.common import BASE_DIR
from collectors.transaction_common import load_rent_base

OUTPUT = BASE_DIR / "data" / "raw" / "api" / "monthly_raw.csv"


# 전월세 공통 원본에서 월세 행만 추려 보증금/월세 두 정답 컬럼으로 저장함
def main() -> None:
    all_rent = load_rent_base()
    monthly = all_rent[all_rent["rent_type"].eq("월세")].copy()
    monthly = monthly[
        (monthly["deposit"] >= 0) & (monthly["monthly_rent"] > 0)
    ]
    monthly = monthly.rename(columns={
        "deposit": "target_deposit",
        "monthly_rent": "target_monthly_rent",
    })
    monthly = monthly.drop(columns=["rent_type"])
    monthly.to_csv(OUTPUT, index=False, encoding="utf-8-sig")
    print(f"saved: {OUTPUT} / {len(monthly):,} rows")


if __name__ == "__main__":
    main()