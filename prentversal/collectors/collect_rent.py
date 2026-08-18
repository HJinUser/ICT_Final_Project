# 서울 전월세 API 원본 수집

# 이 파일에서 사용할 프로젝트 공통 수집 기능 불러옴
from collectors.common import BASE_DIR, collect_seoul_raw_csv

# 입력·출력 파일 위치를 한 곳에서 재사용할 수 있도록 경로를 미리 정의함.
OUT = BASE_DIR / "data" / "raw" / "api" / "rent_api_raw.csv"
YEARS = ["2024", "2025", "2026"]


# 서울 전월세 API를 한 번만 수집해 전세/월세가 공유할 중간 원본을 만듦
def main() -> None:
    collect_seoul_raw_csv(
        service="tbLnOpendataRentV",
        years=YEARS,
        final_path=OUT,
    )


if __name__ == "__main__":
    main()