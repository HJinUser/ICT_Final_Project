# 서울 매매 실거래가 API 원본 수집

# 이 파일에서 사용할 프로젝트 공통 수집 기능 불러옴
from collectors.common import BASE_DIR, collect_seoul_raw_csv

# 입력·출력 파일 위치를 한 곳에서 재사용할 수 있도록 경로를 미리 정의함.
OUT = BASE_DIR / "data" / "raw" / "api" / "sale_api_raw.csv"
YEARS = ["2024", "2025", "2026"]


# 서울 매매 실거래가 API를 연도별로 이어받기 가능한 CSV에 수집함
def main() -> None:
    collect_seoul_raw_csv(
        service="tbLnOpendataRtmsV",
        years=YEARS,
        final_path=OUT,
    )


if __name__ == "__main__":
    main()