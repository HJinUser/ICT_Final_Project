# 가격모델 전처리·학습·평가 공통 기능

# 이 파일에서 사용할 표준/외부 모듈과 머신러닝 기능 불러옴
from __future__ import annotations

from datetime import datetime
from typing import Any

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split
from sklearn.multioutput import MultiOutputRegressor
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

from collectors.common import BASE_DIR

PROCESSED = BASE_DIR / "data" / "processed"
MODELS = BASE_DIR / "models"

CATEGORICAL = ["property_type", "district_name"]
NUMERIC = [
    "area",
    "floor",
    "build_year",
    "station_density",
    "bus_stop_density",
    "hospital_density",
    "mart_density",
    "convenience_density",
    "laundry_density",
    "school_density",
    "academy_density",
    "academy_official_density",
    "park_density",
    "park_area_ratio",
]
FEATURES = CATEGORICAL + NUMERIC


# 숫자형 결측/표준화와 범주형 결측/One-Hot Encoding을 공통 전처리기로 구성함
def build_preprocessor() -> ColumnTransformer:
    numeric_pipe = Pipeline([
        ("imputer", SimpleImputer(strategy="median")),
        ("scaler", StandardScaler()),
    ])

    categorical_pipe = Pipeline([
        ("imputer", SimpleImputer(strategy="most_frequent")),
        ("onehot", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
    ])

    return ColumnTransformer([
        ("num", numeric_pipe, NUMERIC),
        ("cat", categorical_pipe, CATEGORICAL),
    ])


# 회귀 예측값의 MAE·RMSE·R²를 계산함
def regression_metrics(y_true: np.ndarray, pred: np.ndarray) -> dict[str, float]:
    return {
        "mae": float(mean_absolute_error(y_true, pred)),
        "rmse": float(mean_squared_error(y_true, pred) ** 0.5),
        "r2": float(r2_score(y_true, pred)),
    }


# 단일 정답 SALE/JEONSE의 두 후보를 학습·비교해 최적 Pipeline과 metadata를 반환함
def train_single(file_name: str, target: str) -> tuple[Pipeline, dict[str, Any]]:
    df = pd.read_csv(PROCESSED / file_name)
    x = df[FEATURES]
    y = df[target]

    x_train, x_test, y_train, y_test = train_test_split(
        x,
        y,
        test_size=0.2,
        random_state=42,
    )

    candidates = {
        "LinearRegression": LinearRegression(),
        "HistGradientBoostingRegressor": HistGradientBoostingRegressor(
            max_iter=250,
            learning_rate=0.07,
            max_leaf_nodes=31,
            l2_regularization=0.1,
            random_state=42,
        ),
    }

    results: dict[str, dict[str, float]] = {}
    fitted: dict[str, Pipeline] = {}

    for model_name, estimator in candidates.items():
        pipeline = Pipeline([
            ("preprocess", build_preprocessor()),
            ("model", estimator),
        ])
        pipeline.fit(x_train, y_train)
        pred = pipeline.predict(x_test)
        results[model_name] = regression_metrics(y_test.to_numpy(), pred)
        fitted[model_name] = pipeline
        print(model_name, results[model_name])

    best_name = min(results, key=lambda key: results[key]["mae"])
    metadata = {
        "selected_model": best_name,
        "trained_at": datetime.now().isoformat(timespec="seconds"),
        "rows": int(len(df)),
        "train_rows": int(len(x_train)),
        "test_rows": int(len(x_test)),
        "metrics": results[best_name],
        "candidates": results,
    }
    return fitted[best_name], metadata


# MONTHLY의 보증금/월세 두 정답을 두 후보로 학습·비교해 최적 Pipeline과 metadata를 반환함
def train_monthly() -> tuple[Pipeline, dict[str, Any]]:
    df = pd.read_csv(PROCESSED / "monthly_training.csv")
    x = df[FEATURES]
    y = df[["target_deposit", "target_monthly_rent"]]

    x_train, x_test, y_train, y_test = train_test_split(
        x,
        y,
        test_size=0.2,
        random_state=42,
    )

    candidates = {
        "LinearRegression": MultiOutputRegressor(LinearRegression()),
        "HistGradientBoostingRegressor": MultiOutputRegressor(
            HistGradientBoostingRegressor(
                max_iter=250,
                learning_rate=0.07,
                max_leaf_nodes=31,
                l2_regularization=0.1,
                random_state=42,
            )
        ),
    }

    results: dict[str, dict[str, Any]] = {}
    fitted: dict[str, Pipeline] = {}

    for model_name, estimator in candidates.items():
        pipeline = Pipeline([
            ("preprocess", build_preprocessor()),
            ("model", estimator),
        ])
        pipeline.fit(x_train, y_train)
        pred = pipeline.predict(x_test)

        deposit_metrics = regression_metrics(
            y_test.iloc[:, 0].to_numpy(), pred[:, 0]
        )
        rent_metrics = regression_metrics(
            y_test.iloc[:, 1].to_numpy(), pred[:, 1]
        )
        combined_mae = (deposit_metrics["mae"] + rent_metrics["mae"]) / 2

        results[model_name] = {
            "deposit": deposit_metrics,
            "rent": rent_metrics,
            "combined_mae": float(combined_mae),
        }
        fitted[model_name] = pipeline
        print(model_name, results[model_name])

    best_name = min(results, key=lambda key: results[key]["combined_mae"])
    metadata = {
        "selected_model": best_name,
        "trained_at": datetime.now().isoformat(timespec="seconds"),
        "rows": int(len(df)),
        "train_rows": int(len(x_train)),
        "test_rows": int(len(x_test)),
        "metrics": results[best_name],
        "candidates": results,
    }
    return fitted[best_name], metadata


# FastAPI가 그대로 predict할 Pipeline에 평가 metadata를 붙여 joblib 하나로 저장함
def save_pipeline(pipeline: Pipeline, metadata: dict[str, Any], output_name: str) -> None:
    MODELS.mkdir(parents=True, exist_ok=True)
    pipeline.rentversal_metadata_ = metadata
    output = MODELS / output_name
    joblib.dump(pipeline, output)
    print(f"saved: {output}")