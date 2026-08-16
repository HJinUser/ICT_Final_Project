# API Retry/Backoff/Resume 등 공통 기능

# 이 파일에서 사용할 표준/외부 모듈과 프로젝트 내부 기능 불러옴
from __future__ import annotations

import os
import time
from pathlib import Path
from typing import Any

import pandas as pd
import requests
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parents[1]
load_dotenv(BASE_DIR / ".env")

SEOUL_KEY = os.getenv("SEOUL_OPEN_DATA_KEY", "").strip()
PUBLIC_DATA_KEY = os.getenv("PUBLIC_DATA_API_KEY", "").strip()


# 저장할 파일의 부모 폴더가 없으면 미리 생성함
def ensure_dir(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)


# 필수 API Key가 비어 있으면 잘못된 상태로 계속 진행하지 않도록 오류 발생시킴
def require_key(value: str, name: str) -> str:
    if not value:
        raise RuntimeError(f"{name} 값이 .env에 없습니다.")
    return value


# HTTP GET을 Retry + 지수 Backoff 방식으로 실행함
def get_with_retry(
    url: str,
    *,
    params: dict[str, Any] | None = None,
    timeout: int = 60,
    max_attempts: int = 5,
) -> requests.Response:
    last_error: Exception | None = None

    for attempt in range(1, max_attempts + 1):
        try:
            response = requests.get(url, params=params, timeout=timeout)
            response.raise_for_status()
            return response
        except requests.RequestException as exc:
            last_error = exc
            if attempt >= max_attempts:
                break

            wait_seconds = 2 ** attempt
            print(
                f"HTTP 요청 실패: {exc} / "
                f"{wait_seconds}초 후 재시도 ({attempt}/{max_attempts})"
            )
            time.sleep(wait_seconds)

    raise RuntimeError(
        f"HTTP 요청이 {max_attempts}회 연속 실패했습니다: {last_error}"
    ) from last_error


# 서울 열린데이터광장 API의 한 페이지를 Retry 적용해 조회함
def fetch_seoul_page(
    service: str,
    start: int,
    end: int,
    extra_segments: list[str] | None = None,
) -> dict[str, Any]:
    key = require_key(SEOUL_KEY, "SEOUL_OPEN_DATA_KEY")
    extra_segments = extra_segments or []
    suffix = "/" + "/".join(str(x) for x in extra_segments) if extra_segments else ""
    url = (
        f"http://openapi.seoul.go.kr:8088/{key}/json/"
        f"{service}/{start}/{end}{suffix}"
    )

    payload: dict[str, Any] | None = None
    json_error: Exception | None = None

    # HTTP 200이어도 응답이 중간에 깨진 경우가 있을 수 있어 JSON 해석도 재시도함
    for attempt in range(1, 6):
        response = get_with_retry(url, timeout=60)
        try:
            payload = response.json()
            break
        except ValueError as exc:
            json_error = exc
            if attempt >= 5:
                break
            wait_seconds = 2 ** attempt
            print(f"서울 API JSON 해석 실패 / {wait_seconds}초 후 재시도")
            time.sleep(wait_seconds)

    if payload is None:
        raise RuntimeError("서울 API JSON 응답을 해석할 수 없습니다.") from json_error

    if service not in payload:
        raise RuntimeError(f"서울 API 응답 오류: {payload}")

    block = payload[service]
    result = block.get("RESULT", {})
    code = result.get("CODE")
    if code and code != "INFO-000":
        raise RuntimeError(f"서울 API 오류 {code}: {result.get('MESSAGE')}")

    return block


# 비교적 작은 서울 API를 페이지 단위로 끝까지 조회해 행 목록으로 반환함
def fetch_seoul_rows(
    service: str,
    extra_segments: list[str] | None = None,
    page_size: int = 1000,
) -> list[dict[str, Any]]:
    start = 1
    rows: list[dict[str, Any]] = []

    while True:
        end = start + page_size - 1
        block = fetch_seoul_page(service, start, end, extra_segments)
        batch = block.get("row", [])
        rows.extend(batch)
        total = int(block.get("list_total_count", len(rows)))

        print(f"[{service}] {len(rows):,} / {total:,}")

        if not batch:
            # API가 전체 건수보다 일찍 빈 페이지를 반환하면 불완전 수집을 정상 완료로 처리하지 않음
            if len(rows) < total:
                raise RuntimeError(
                    f"[{service}] 예상보다 일찍 빈 페이지가 반환됨: "
                    f"{len(rows):,} / {total:,}"
                )
            break

        if len(rows) >= total:
            break
        start = end + 1

    return rows


# .part.csv에서 특정 연도의 이미 저장된 행 수를 메모리를 과하게 쓰지 않고 계산함
def count_saved_year_rows(part_path: Path, year: str) -> int:
    if not part_path.exists() or part_path.stat().st_size == 0:
        return 0

    total = 0
    try:
        for chunk in pd.read_csv(
            part_path,
            usecols=["_source_year"],
            dtype={"_source_year": str},
            chunksize=100_000,
            encoding="utf-8-sig",
        ):
            total += int(chunk["_source_year"].eq(str(year)).sum())
    except ValueError as exc:
        raise RuntimeError(
            f"기존 중간 파일의 형식이 올바르지 않습니다: {part_path}"
        ) from exc

    return total


# 대용량 서울 API를 페이지마다 .part.csv에 저장하고 중단 시 이어받을 수 있게 수집함
def collect_seoul_raw_csv(
    service: str,
    years: list[str],
    final_path: Path,
    page_size: int = 1000,
) -> Path:
    ensure_dir(final_path)
    part_path = final_path.with_suffix(".part.csv")

    # 최종 파일이 이미 있으면 의도치 않은 전체 재수집을 막음
    if final_path.exists():
        print(f"이미 최종 파일이 존재함: {final_path}")
        print("처음부터 다시 수집하려면 최종 파일과 .part.csv를 직접 삭제한 뒤 실행함.")
        return final_path

    for year in years:
        saved = count_saved_year_rows(part_path, year)

        # 첫 1건 조회로 현재 연도의 전체 건수를 먼저 확인해 완료된 연도는 재요청하지 않음
        info = fetch_seoul_page(service, 1, 1, [year])
        total = int(info.get("list_total_count", 0))

        # 이전 .part.csv가 현재 API 전체 건수보다 많으면 원본 변경/오염 가능성이 있으므로 자동 완료 처리하지 않음
        if saved > total:
            raise RuntimeError(
                f"[{service} / {year}] 중간 파일 건수가 현재 API 전체 건수보다 많음: "
                f"{saved:,} > {total:,}. .part.csv를 확인한 뒤 필요하면 삭제하고 다시 수집함."
            )

        if saved == total:
            print(f"[{service} / {year}] 이미 완료됨: {saved:,} / {total:,}")
            continue

        start = saved + 1

        while True:
            end = start + page_size - 1
            block = fetch_seoul_page(service, start, end, [year])
            batch = block.get("row", [])
            total = int(block.get("list_total_count", total))

            if not batch:
                # 전체 건수보다 적게 저장된 상태에서 빈 페이지가 오면 완성 파일로 바꾸지 않음
                if saved < total:
                    raise RuntimeError(
                        f"[{service} / {year}] 예상보다 일찍 빈 페이지가 반환됨: "
                        f"{saved:,} / {total:,}"
                    )
                print(f"[{service} / {year}] 수집 완료: {saved:,} / {total:,}")
                break

            batch_df = pd.DataFrame(batch)
            batch_df["_source_year"] = str(year)

            # API 한 페이지를 받을 때마다 즉시 디스크에 추가 저장해 중간 실패에 대비함
            write_header = not part_path.exists() or part_path.stat().st_size == 0
            batch_df.to_csv(
                part_path,
                mode="a",
                header=write_header,
                index=False,
                encoding="utf-8-sig" if write_header else "utf-8",
            )

            saved += len(batch_df)
            print(f"[{service} / {year}] {saved:,} / {total:,}")

            if saved >= total:
                break
            start = saved + 1

    if not part_path.exists():
        raise RuntimeError(f"수집 결과가 생성되지 않았습니다: {part_path}")

    # 모든 연도 수집이 끝난 경우에만 .part.csv를 최종 파일명으로 변경함
    part_path.replace(final_path)
    print(f"수집 완료: {final_path}")
    return final_path


# 쉼표·공백 등이 섞인 문자열 값을 숫자형으로 안전하게 변환함
def clean_number(series: pd.Series) -> pd.Series:
    return pd.to_numeric(
        series.astype(str)
        .str.replace(",", "", regex=False)
        .str.strip()
        .replace({"": None, "nan": None, "None": None}),
        errors="coerce",
    )


# 서울시 건물용도 값을 프로젝트에서 사용하는 매물 유형 코드로 변환함
def normalize_property_type(value: Any) -> str | None:
    mapping = {
        "아파트": "APARTMENT",
        "단독다가구": "ONE_TWO_ROOM",
        "연립다세대": "VILLA",
        "오피스텔": "OFFICETEL",
    }
    return mapping.get(str(value).strip())