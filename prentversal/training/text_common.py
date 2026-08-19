# Komoran·TF-IDF 텍스트 분석 공통 기능

# Komoran·TF-IDF 텍스트 분석 공통 기능

# 이 파일에서 사용할 외부 모듈과 프로젝트 경로 불러옴
from collections import Counter

import pandas as pd
from konlpy.tag import Komoran
from sklearn.feature_extraction.text import TfidfVectorizer

from collectors.common import BASE_DIR

# 입력·출력 파일 위치를 한 곳에서 재사용할 수 있도록 경로를 미리 정의함.
PROCESSED = BASE_DIR / "data" / "processed"
OUTPUTS = BASE_DIR / "outputs"

STOPWORDS = {
    "동네", "곳", "정도", "사람", "서울", "지역", "여기", "저기",
    "정말", "너무", "많다", "있다", "없다", "하다", "되다",
}

komoran = Komoran()


# Komoran 형태소 분석으로 명사/형용사 토큰만 추림
def tokenize(text: str) -> list[str]:
    tokens: list[str] = []
    # 대상 데이터를 하나씩 순회하면서 각 항목에 동일한 처리 규칙을 적용함.
    for word, tag in komoran.pos(str(text)):
        if tag in {"NNG", "NNP", "VA"} and len(word) >= 2 and word not in STOPWORDS:
            tokens.append(word)
    return tokens


# 병합된 한줄평 CSV를 읽고 토큰/토큰문자열 컬럼을 만들어 반환함
def load_tokenized_reviews() -> pd.DataFrame:
    # 다음 계산에 사용할 입력 데이터를 파일에서 DataFrame으로 불러옴.
    df = pd.read_csv(PROCESSED / "neighborhood_reviews.csv", dtype=str)
    df = df.dropna(subset=["admin_code", "admin_name", "district_name", "text"])
    df["tokens"] = df["text"].map(tokenize)
    df["token_text"] = df["tokens"].map(lambda xs: " ".join(xs))
    # 계산이 끝난 결과를 호출한 쪽에서 이어서 사용할 수 있도록 반환함.
    return df


# 한 행정동 문서 그룹의 대표 키워드 TOP 10을 TF-IDF/빈도 방식으로 계산함
def top_keywords(group: pd.DataFrame) -> list[dict[str, float | str]]:
    docs = group["token_text"].loc[group["token_text"].str.len() > 0].tolist()
    # 현재 값이나 상태가 해당 조건에 맞는지 확인한 뒤 필요한 분기 처리를 수행함.
    if not docs:
        return []

    if len(docs) >= 2:
        vectorizer = TfidfVectorizer(max_features=100)
        # 현재 데이터 기준으로 전처리기를 학습하면서 변환 결과까지 한 번에 생성함.
        matrix = vectorizer.fit_transform(docs)
        mean_score = matrix.mean(axis=0).A1
        words = vectorizer.get_feature_names_out()
        ranked = sorted(zip(words, mean_score), key=lambda x: x[1], reverse=True)
        # 계산이 끝난 결과를 호출한 쪽에서 이어서 사용할 수 있도록 반환함.
        return [
            {"keyword": word, "score": round(float(score), 4)}
            for word, score in ranked[:10]
        ]

    counts = Counter(group.iloc[0]["tokens"])
    # 계산이 끝난 결과를 호출한 쪽에서 이어서 사용할 수 있도록 반환함.
    return [
        {"keyword": word, "score": float(count)}
        for word, count in counts.most_common(10)
    ]