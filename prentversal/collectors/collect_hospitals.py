# 서울 병원 위치 데이터 수집

# 이 파일에서 사용할 표준/외부 모듈과 프로젝트 내부 기능 불러옴
from __future__ import annotations

import xml.etree.ElementTree as ET

import pandas as pd

from collectors.common import BASE_DIR, PUBLIC_DATA_KEY, get_with_retry, require_key

OUT = BASE_DIR / "data" / "reference" / "hospitals.csv"
URL = "https://apis.data.go.kr/B551182/hospInfoServicev2/getHospBasisList"


# XML item에서 후보 태그명을 순서대로 확인해 실제 텍스트 값을 꺼내는 함수임
def text_of(item: ET.Element, names: list[str]) -> str | None:
    # 대상 데이터를 하나씩 순회하면서 같은 처리 반복함
    for name in names:
        found = item.find(name)
        if found is not None and found.text:
            # 계산/조회가 끝난 최종 결과를 호출한 쪽에 반환함
            return found.text.strip()
    # 계산/조회가 끝난 최종 결과를 호출한 쪽에 반환함
    return None


# 서울 병원 API를 페이지별로 수집하고 좌표·중복을 정리해 CSV로 저장하는 진입 함수임
def main() -> None:
    key = require_key(PUBLIC_DATA_KEY, "PUBLIC_DATA_API_KEY")
    page = 1
    rows = []

    while True:
        params = {
            "serviceKey": key,
            "pageNo": page,
            "numOfRows": 1000,
            "sidoCd": "110000",
        }
        # 공통 Retry/Backoff가 적용된 GET 요청으로 일시적인 통신 실패에 대비함
        response = get_with_retry(URL, params=params, timeout=60)
        root = ET.fromstring(response.content)

        total_text = root.findtext(".//totalCount")
        total = int(total_text or 0)
        items = root.findall(".//item")

        # 전체 건수가 남아 있는데 빈 페이지가 오면 불완전 수집을 정상 완료로 처리하지 않음
        if not items:
            if total > (page - 1) * 1000:
                raise RuntimeError(
                    f"병원 API가 예상보다 일찍 빈 페이지를 반환함: "
                    f"page={page}, total={total:,}"
                )
            break

        # 대상 데이터를 하나씩 순회하면서 같은 처리 반복함
        for item in items:
            name = text_of(item, ["yadmNm", "YadmNm"])
            address = text_of(item, ["addr", "Addr"])
            x = text_of(item, ["XPos", "xPos", "xpos"])
            y = text_of(item, ["YPos", "yPos", "ypos"])

            # 외부 파일/API 처리 중 발생할 수 있는 예외를 안전하게 처리하기 위해 시도함
            try:
                lon = float(x) if x else None
                lat = float(y) if y else None
            # 위 처리에서 발생한 예외를 잡아 대체 처리하거나 명확한 오류로 변환함
            except ValueError:
                lon = lat = None

            if name and lat is not None and lon is not None:
                rows.append({
                    "name": name,
                    "address": address,
                    "latitude": lat,
                    "longitude": lon,
                })

        # totalCount가 없는 예외 응답에서는 지금까지 모은 행 수를 기준으로 종료 여부를 판단함
        if total == 0:
            total = len(rows)
        print(f"hospital page={page}, collected={len(rows):,}/{total:,}")
        if page * 1000 >= total:
            break
        page += 1

    # 수집/가공한 값을 pandas DataFrame 형태로 구성함
    df = pd.DataFrame(rows).drop_duplicates(subset=["name", "address"])
    df = df[
        df["latitude"].between(37.3, 37.8)
        & df["longitude"].between(126.7, 127.3)
    ]

    OUT.parent.mkdir(parents=True, exist_ok=True)
    # 정리된 결과를 다음 단계에서 재사용할 CSV 파일로 저장함
    df.to_csv(OUT, index=False, encoding="utf-8-sig")
    print(f"saved: {OUT} / {len(df):,} rows")


if __name__ == "__main__":
    main()