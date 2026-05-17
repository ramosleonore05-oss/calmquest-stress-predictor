from pathlib import Path
import json
import os
from typing import Dict, List

import joblib
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field


BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR.parent / "ml" / "stress_model.joblib"
METRICS_PATH = BASE_DIR.parent / "ml" / "metrics.json"
FRONTEND_DIST = BASE_DIR.parent / "frontend" / "dist"


app = FastAPI(
    title="Student Stress Level Predictor API",
    description="Predicts student stress level from lifestyle and academic factors.",
    version="1.0.0",
)

# During development, allow Vite frontend access. Set FRONTEND_ORIGIN in hosted
# environments when the frontend is deployed separately from this API.
frontend_origin = os.getenv("FRONTEND_ORIGIN")
allowed_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
if frontend_origin:
    allowed_origins.append(frontend_origin)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+):5173",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class StressInput(BaseModel):
    sleep_quality: int = Field(..., ge=1, le=5, description="Sleep quality rating from 1 to 5")
    headaches_per_week: int = Field(..., ge=0, le=5, description="Number of headache occurrences per week")
    academic_performance: int = Field(..., ge=1, le=5, description="Academic performance rating from 1 to 5")
    study_load: int = Field(..., ge=1, le=5, description="Study load rating from 1 to 5")
    extracurricular_per_week: int = Field(..., ge=0, le=5, description="Extracurricular activity frequency per week")


class FactorInsight(BaseModel):
    factor: str
    value: int
    status: str
    impact: str
    suggestion: str


class ProbabilityBand(BaseModel):
    level: int
    label: str
    probability: float


class ModelMetrics(BaseModel):
    accuracy: float
    dataset_rows: int


class PredictionResponse(BaseModel):
    predicted_stress_level: int
    stress_label: str
    confidence: float
    probability_bands: List[ProbabilityBand]
    factor_insights: List[FactorInsight]
    action_plan: List[str]
    model_metrics: ModelMetrics
    recommendation: str
    input_received: Dict[str, int]


def load_model_artifact():
    if not MODEL_PATH.exists():
        raise RuntimeError(
            f"Model file not found at {MODEL_PATH}. "
            "Run `python ml/train_model.py` first."
        )

    return joblib.load(MODEL_PATH)


artifact = load_model_artifact()
model = artifact["model"]
features = artifact["features"]
labels = artifact["labels"]


def load_metrics() -> Dict[str, float]:
    if not METRICS_PATH.exists():
        return {
            "accuracy": 0,
            "dataset_rows": 0,
        }

    return json.loads(METRICS_PATH.read_text(encoding="utf-8"))


metrics = load_metrics()


def get_recommendation(level: int) -> str:
    if level <= 2:
        return "Your stress level appears manageable. Maintain healthy sleep, study balance, and regular breaks."
    if level == 3:
        return "Your stress level is moderate. Try organizing your tasks, improving sleep quality, and taking short breaks."
    if level == 4:
        return "Your stress level is high. Reduce overload where possible, rest properly, and consider talking to a teacher, adviser, or counselor."
    return "Your stress level is very high. Seek support from a trusted person, counselor, adviser, or health professional as soon as possible."


def build_factor_insights(data: Dict[str, int]) -> List[FactorInsight]:
    insight_rules = {
        "sleep_quality": {
            "factor": "Sleep Quality",
            "good": lambda value: value >= 4,
            "watch": lambda value: value == 3,
            "low": "Low sleep quality can reduce recovery and make school pressure feel heavier.",
            "watch_text": "Sleep is adequate but could still be more restorative.",
            "good_text": "Sleep quality is a protective factor in this profile.",
            "suggestion": "Protect a consistent bedtime and reduce screen time before sleep.",
        },
        "headaches_per_week": {
            "factor": "Headaches",
            "good": lambda value: value <= 1,
            "watch": lambda value: value in [2, 3],
            "low": "Frequent headaches can be a physical signal of overload or poor recovery.",
            "watch_text": "Headaches are present often enough to monitor.",
            "good_text": "Headache frequency is low in this profile.",
            "suggestion": "Track headache timing and hydration, and seek support if they persist.",
        },
        "academic_performance": {
            "factor": "Academic Performance",
            "good": lambda value: value >= 4,
            "watch": lambda value: value == 3,
            "low": "Lower academic confidence can increase pressure and avoidance.",
            "watch_text": "Academic performance is steady but may benefit from structure.",
            "good_text": "Academic performance is a stabilizing factor.",
            "suggestion": "Break difficult work into smaller goals and ask early for clarification.",
        },
        "study_load": {
            "factor": "Study Load",
            "good": lambda value: value <= 2,
            "watch": lambda value: value == 3,
            "low": "A heavy study load is one of the strongest stress pressure points here.",
            "watch_text": "Study load is moderate and worth scheduling carefully.",
            "good_text": "Study load looks manageable.",
            "suggestion": "Use a weekly study plan with short breaks and clear stop times.",
        },
        "extracurricular_per_week": {
            "factor": "Extracurricular Activity",
            "good": lambda value: 1 <= value <= 3,
            "watch": lambda value: value in [0, 4],
            "low": "Too little or too much extracurricular activity can affect balance.",
            "watch_text": "Activity balance may need a small adjustment.",
            "good_text": "Extracurricular activity is in a balanced range.",
            "suggestion": "Keep activities restorative and avoid crowding out sleep or study recovery.",
        },
    }

    insights = []
    for key, rule in insight_rules.items():
        value = data[key]
        if rule["good"](value):
            status = "supportive"
            impact = rule["good_text"]
        elif rule["watch"](value):
            status = "watch"
            impact = rule["watch_text"]
        else:
            status = "priority"
            impact = rule["low"]

        insights.append(
            FactorInsight(
                factor=rule["factor"],
                value=value,
                status=status,
                impact=impact,
                suggestion=rule["suggestion"],
            )
        )

    priority_order = {"priority": 0, "watch": 1, "supportive": 2}
    return sorted(insights, key=lambda item: priority_order[item.status])


def build_action_plan(level: int, insights: List[FactorInsight]) -> List[str]:
    priority_items = [item for item in insights if item.status == "priority"]
    actions = [item.suggestion for item in priority_items[:2]]

    if level >= 4:
        actions.append("Talk with a teacher, adviser, counselor, or trusted adult if stress is affecting daily life.")
    elif level == 3:
        actions.append("Choose one high-pressure task and schedule a focused 25-minute work block today.")
    else:
        actions.append("Keep the current routine stable and check in again after a demanding school day.")

    return list(dict.fromkeys(actions))[:3]


def build_probability_bands(df: pd.DataFrame) -> List[ProbabilityBand]:
    if not hasattr(model, "predict_proba"):
        return []

    probabilities = model.predict_proba(df)[0]
    classes = model.classes_

    return [
        ProbabilityBand(
            level=int(level),
            label=labels.get(int(level), "Unknown Stress Level"),
            probability=round(float(probability), 3),
        )
        for level, probability in sorted(zip(classes, probabilities), key=lambda item: item[0])
    ]


@app.get("/api")
def api_root():
    return {
        "message": "Student Stress Level Predictor API is running.",
        "docs": "/docs",
    }


@app.get("/health")
def health():
    return {
        "status": "ok",
        "model_loaded": True,
        "features": features,
        "accuracy": metrics.get("accuracy", 0),
        "dataset_rows": metrics.get("dataset_rows", 0),
    }


@app.post("/predict", response_model=PredictionResponse)
def predict_stress(data: StressInput):
    try:
        input_dict = data.model_dump()

        df = pd.DataFrame([input_dict])
        df = df[features]

        prediction = int(model.predict(df)[0])
        label = labels.get(prediction, "Unknown Stress Level")
        probability_bands = build_probability_bands(df)
        confidence = 0
        if probability_bands:
            confidence = max(band.probability for band in probability_bands)
        factor_insights = build_factor_insights(input_dict)

        return PredictionResponse(
            predicted_stress_level=prediction,
            stress_label=label,
            confidence=confidence,
            probability_bands=probability_bands,
            factor_insights=factor_insights,
            action_plan=build_action_plan(prediction, factor_insights),
            model_metrics=ModelMetrics(
                accuracy=metrics.get("accuracy", 0),
                dataset_rows=metrics.get("dataset_rows", 0),
            ),
            recommendation=get_recommendation(prediction),
            input_received=input_dict,
        )

    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


if FRONTEND_DIST.exists():
    app.mount("/", StaticFiles(directory=FRONTEND_DIST, html=True), name="frontend")
