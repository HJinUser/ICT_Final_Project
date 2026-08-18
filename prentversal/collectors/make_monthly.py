# 전월세 원본에서 월세 데이터 분리

# 이 파일에서 사용할 프로젝트 공통 기능 불러옴
from collectors.common import BASE_DIR
from collectors.transaction_common import load_rent_base

# 입력·출력 파일 위치를 한 곳에서 재사용할 수 있도록 경로를 미리 정의함.
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
    # 처리가 끝난 결과를 다음 단계에서 다시 사용할 수 있도록 파일로 저장함.
    monthly.to_csv(OUTPUT, index=False, encoding="utf-8-sig")
    print(f"saved: {OUTPUT} / {len(monthly):,} rows")


if __name__ == "__main__":
    main()