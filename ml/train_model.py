import json
from pathlib import Path

import joblib
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler


BASE_DIR = Path(__file__).resolve().parent
DATA_PATH = BASE_DIR.parent / "data" / "Student Stress Factors.csv"
MODEL_PATH = BASE_DIR / "stress_model.joblib"
METRICS_PATH = BASE_DIR / "metrics.json"


COLUMN_MAP = {
    "Kindly Rate your Sleep Quality 😴": "sleep_quality",
    "How many times a week do you suffer headaches 🤕?": "headaches_per_week",
    "How would you rate you academic performance 👩‍🎓?": "academic_performance",
    "how would you rate your study load?": "study_load",
    "How many times a week you practice extracurricular activities 🎾?": "extracurricular_per_week",
    "How would you rate your stress levels?": "stress_level",
}


FEATURES = [
    "sleep_quality",
    "headaches_per_week",
    "academic_performance",
    "study_load",
    "extracurricular_per_week",
]

TARGET = "stress_level"


def load_dataset() -> pd.DataFrame:
    if not DATA_PATH.exists():
        raise FileNotFoundError(f"Dataset not found at: {DATA_PATH}")

    df = pd.read_csv(DATA_PATH)
    df = df.rename(columns=COLUMN_MAP)

    missing = [col for col in FEATURES + [TARGET] if col not in df.columns]
    if missing:
        raise ValueError(f"Missing required columns: {missing}")

    df = df[FEATURES + [TARGET]].copy()
    df = df.dropna()

    for col in FEATURES + [TARGET]:
        df[col] = pd.to_numeric(df[col], errors="coerce")

    df = df.dropna()
    df[TARGET] = df[TARGET].astype(int)

    return df


def train_model() -> None:
    df = load_dataset()

    X = df[FEATURES]
    y = df[TARGET]

    # Stratify keeps stress-level distribution similar in train and test sets.
    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.20,
        random_state=42,
        stratify=y,
    )

    model = Pipeline(
        steps=[
            ("scaler", StandardScaler()),
            (
                "classifier",
                RandomForestClassifier(
                    n_estimators=300,
                    max_depth=8,
                    random_state=42,
                    class_weight="balanced",
                ),
            ),
        ]
    )

    model.fit(X_train, y_train)

    predictions = model.predict(X_test)
    accuracy = accuracy_score(y_test, predictions)

    report = classification_report(
        y_test,
        predictions,
        output_dict=True,
        zero_division=0,
    )

    artifact = {
        "model": model,
        "features": FEATURES,
        "target": TARGET,
        "labels": {
            1: "Very Low Stress",
            2: "Low Stress",
            3: "Moderate Stress",
            4: "High Stress",
            5: "Very High Stress",
        },
    }

    joblib.dump(artifact, MODEL_PATH)

    metrics = {
        "accuracy": round(float(accuracy), 4),
        "classification_report": report,
        "dataset_rows": int(len(df)),
        "features": FEATURES,
        "target": TARGET,
    }

    METRICS_PATH.write_text(json.dumps(metrics, indent=2), encoding="utf-8")

    print("Model training completed.")
    print(f"Rows used: {len(df)}")
    print(f"Accuracy: {accuracy:.4f}")
    print(f"Saved model to: {MODEL_PATH}")
    print(f"Saved metrics to: {METRICS_PATH}")


if __name__ == "__main__":
    train_model()