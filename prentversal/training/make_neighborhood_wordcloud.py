# 발표용 한줄평 WordCloud 이미지 생성

# 이 파일에서 사용할 표준/외부 모듈과 프로젝트 내부 기능 불러옴
from __future__ import annotations

import os
import random
from collections import Counter
from pathlib import Path

import pandas as pd
from wordcloud import WordCloud

# collectors.common을 불러오는 순간 프로젝트 .env가 load_dotenv로 읽힌다.
# 아래에서 KOREAN_FONT_PATH를 os.getenv로 꺼내 쓰므로 이 import를 지우면 안 된다.
from collectors.common import BASE_DIR  # noqa: F401
from training.text_common import OUTPUTS, load_tokenized_reviews

# 입력·출력 파일 위치를 한 곳에서 재사용할 수 있도록 경로를 미리 정의함.
OUTPUT = OUTPUTS / "neighborhood_wordcloud.png"

# 이미지 크기와 표현 범위를 한 곳에서 조정할 수 있도록 상수로 둠.
#
# 이 그림은 메인 화면에서 원본보다 훨씬 작게(데스크톱 약 480px, 모바일 약 310px) 줄어든다.
# 그래서 단어를 많이 넣을수록 작은 글씨가 그 비율만큼 더 줄어 읽을 수 없게 된다.
# MAX_WORDS를 늘리려면 MIN_FONT_SIZE도 같이 올려야 축소 후에도 글자가 남는다.
WIDTH = 1200
HEIGHT = 900
MAX_WORDS = 45
MIN_FONT_SIZE = 30
MAX_FONT_SIZE = 130

# 화면 디자인 토큰(styles/tokens.css)의 보라 계열과 본문 먹색을 그대로 씀.
# 이미지가 사이트 안에 들어갔을 때 색이 따로 놀지 않게 하기 위함이다.
PALETTE = ["#4B0082", "#31005A", "#3f3f48", "#5a5a65"]

# 자주 나온 단어일수록 진한 보라가 걸리도록 상위 몇 개를 따로 관리함.
STRONG_RANK = 12

# Komoran이 문장을 잘못 끊어 만들어 낸 조각들이다. 그림에 섞이면 뜻이 통하지 않는다.
# 여기서만 걸러낸다. text_common.py의 STOPWORDS를 고치면 neighborhood_keywords.json과
# 관리자 화면 통계까지 함께 바뀌므로, 발표용 이미지 때문에 공용 산출물을 건드리지 않는다.
EXTRA_STOPWORDS = {
    "가나", "안보", "형성", "대가", "길이", "지구",
    "곤란", "심하", "특정", "전체", "생각", "느낌",
}


# .env의 KOREAN_FONT_PATH를 읽어 실제로 존재하는 한글 폰트 경로를 돌려줌
def resolve_font_path() -> str:
    raw = os.getenv("KOREAN_FONT_PATH", "").strip()
    # 폰트 경로가 없으면 WordCloud가 한글을 네모로 그리므로 진행하지 않고 즉시 실패시킴
    if not raw:
        raise RuntimeError(
            "KOREAN_FONT_PATH 값이 .env에 없습니다. "
            "예: KOREAN_FONT_PATH=C:/Windows/Fonts/malgun.ttf"
        )

    path = Path(raw)
    # 경로가 적혀 있어도 실제 파일이 없으면 같은 문제가 생기므로 존재 여부까지 확인함
    if not path.is_file():
        raise RuntimeError(f"KOREAN_FONT_PATH에 적힌 폰트 파일이 없습니다: {path}")

    # 계산이 끝난 결과를 호출한 쪽에서 이어서 사용할 수 있도록 반환함.
    return str(path)


# 행정동으로 복제된 한줄평을 원본 1건으로 되돌린 뒤 토큰 빈도를 세어 반환함
def count_tokens(df: pd.DataFrame) -> Counter:
    # merge_neighborhood_reviews.py는 "성수동" 같은 응답을 걸치는 행정동 수만큼 복제한다.
    # 그대로 세면 특정 응답의 단어만 여러 번 반영되므로 원본 응답 단위로 되돌린 뒤 센다.
    unique = df.drop_duplicates(subset=["district_name", "legal_dong", "text"])

    counter: Counter = Counter()
    # 대상 데이터를 하나씩 순회하면서 각 항목에 동일한 처리 규칙을 적용함.
    for tokens in unique["tokens"]:
        counter.update(word for word in tokens if word not in EXTRA_STOPWORDS)

    # 계산이 끝난 결과를 호출한 쪽에서 이어서 사용할 수 있도록 반환함.
    return counter


# 상위 단어에는 진한 보라, 나머지에는 보조색이 걸리도록 단어별 색을 결정함
def build_color_func(counter: Counter):
    strong = {word for word, _ in counter.most_common(STRONG_RANK)}

    # WordCloud가 단어를 그릴 때마다 호출하는 색상 결정 함수임
    def color_func(word, font_size, position, orientation, font_path, random_state):
        # 상위 단어는 브랜드 보라 두 가지 안에서만 고르고, 나머지는 먹색 계열로 눌러 준다.
        if word in strong:
            return random.choice(PALETTE[:2])
        return random.choice(PALETTE[2:])

    # 계산이 끝난 결과를 호출한 쪽에서 이어서 사용할 수 있도록 반환함.
    return color_func


# 병합된 한줄평에서 토큰 빈도를 세어 발표용 WordCloud PNG를 생성함
def main() -> None:
    font_path = resolve_font_path()

    # 텍스트마이닝 산출물이 아직 없으면 원인을 알기 쉽게 알려주고 멈춤
    try:
        df = load_tokenized_reviews()
    except FileNotFoundError as error:
        raise RuntimeError(
            "data/processed/neighborhood_reviews.csv가 없습니다. "
            "merge_neighborhood_reviews.py를 먼저 실행하세요."
        ) from error

    counter = count_tokens(df)
    # 형태소 분석 결과가 모두 불용어로 걸러진 경우까지 대비해 비어 있으면 진행하지 않음
    if not counter:
        raise RuntimeError("한줄평에서 추출된 단어가 없어 WordCloud를 만들 수 없습니다.")

    # 같은 입력에서 매번 같은 그림이 나오도록 난수 시드를 고정함.
    random.seed(20260824)

    cloud = WordCloud(
        font_path=font_path,
        width=WIDTH,
        height=HEIGHT,
        # 카드 배경색이 바뀌어도 그대로 얹을 수 있도록 배경을 투명하게 둔다.
        background_color=None,
        mode="RGBA",
        max_words=MAX_WORDS,
        min_font_size=MIN_FONT_SIZE,
        max_font_size=MAX_FONT_SIZE,
        # 한글은 90도로 눕히면 읽기 어려우므로 모든 단어를 가로로만 배치한다.
        prefer_horizontal=1.0,
        relative_scaling=0.45,
        # 가장자리에서 글자가 잘리지 않도록 단어 사이 여백을 준다.
        margin=6,
        random_state=20260824,
    )
    cloud.generate_from_frequencies(dict(counter))
    cloud.recolor(color_func=build_color_func(counter))

    # 저장할 상위 폴더가 없어도 실행될 수 있도록 필요한 디렉터리를 먼저 생성함.
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    cloud.to_file(str(OUTPUT))

    unique_count = len(df.drop_duplicates(subset=["district_name", "legal_dong", "text"]))
    print(f"saved: {OUTPUT}")
    print(f"원본 한줄평 {unique_count:,}건 / 사용 단어 {min(len(counter), MAX_WORDS):,}개")
    print("상위 단어:", counter.most_common(10))


if __name__ == "__main__":
    main()
