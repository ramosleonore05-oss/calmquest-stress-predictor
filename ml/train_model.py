import json
import os
from pathlib import Path

import joblib
import pandas as pd
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import ConfusionMatrixDisplay, accuracy_score, classification_report, confusion_matrix, f1_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler


BASE_DIR = Path(__file__).resolve().parent
DATA_PATH = BASE_DIR.parent / "data" / "Student Stress Factors.csv"
MODEL_PATH = BASE_DIR / "stress_model.joblib"
METRICS_PATH = BASE_DIR / "metrics.json"
VISUALIZATIONS_DIR = BASE_DIR / "visualizations"
MPL_CONFIG_DIR = BASE_DIR / ".matplotlib-cache"

MPL_CONFIG_DIR.mkdir(exist_ok=True)
os.environ.setdefault("MPLCONFIGDIR", str(MPL_CONFIG_DIR))

import matplotlib

matplotlib.use("Agg")

import matplotlib.pyplot as plt


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

LABELS = {
    1: "Very Low Stress",
    2: "Low Stress",
    3: "Moderate Stress",
    4: "High Stress",
    5: "Very High Stress",
}

PLOT_STYLE = {
    "figure.facecolor": "#ffffff",
    "axes.facecolor": "#ffffff",
    "axes.edgecolor": "#d9dee8",
    "axes.labelcolor": "#273142",
    "axes.titlecolor": "#172033",
    "xtick.color": "#4a5568",
    "ytick.color": "#4a5568",
    "grid.color": "#edf1f7",
    "font.size": 11,
}


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


def build_models() -> dict[str, Pipeline]:
    return {
        "tuned_random_forest": Pipeline(
            steps=[
                ("scaler", StandardScaler()),
                (
                    "classifier",
                    RandomForestClassifier(
                        n_estimators=300,
                        max_depth=None,
                        min_samples_split=2,
                        min_samples_leaf=1,
                        random_state=42,
                        class_weight="balanced",
                    ),
                ),
            ]
        ),
        "gradient_boosting": Pipeline(
            steps=[
                ("scaler", StandardScaler()),
                (
                    "classifier",
                    GradientBoostingClassifier(
                        n_estimators=150,
                        learning_rate=0.05,
                        max_depth=3,
                        random_state=42,
                    ),
                ),
            ]
        ),
    }


def save_confusion_matrix_plot(y_test: pd.Series, predictions, model_name: str) -> Path:
    labels = sorted(LABELS)
    matrix = confusion_matrix(y_test, predictions, labels=labels)
    display_labels = [str(label) for label in labels]

    with plt.rc_context(PLOT_STYLE):
        fig, ax = plt.subplots(figsize=(8, 6))
        display = ConfusionMatrixDisplay(
            confusion_matrix=matrix,
            display_labels=display_labels,
        )
        display.plot(ax=ax, cmap="Blues", colorbar=False, values_format="d")
        ax.set_title(f"Confusion Matrix - {model_name.replace('_', ' ').title()}")
        ax.set_xlabel("Predicted Stress Level")
        ax.set_ylabel("Actual Stress Level")
        fig.tight_layout()

        path = VISUALIZATIONS_DIR / f"{model_name}_confusion_matrix.png"
        fig.savefig(path, dpi=150)
        plt.close(fig)

    return path


def save_model_accuracy_plot(model_metrics: dict[str, dict[str, float]]) -> Path:
    names = list(model_metrics)
    accuracies = [model_metrics[name]["accuracy"] for name in names]
    display_names = [name.replace("_", " ").title() for name in names]

    with plt.rc_context(PLOT_STYLE):
        fig, ax = plt.subplots(figsize=(8, 5))
        bars = ax.bar(display_names, accuracies, color=["#2563eb", "#14b8a6"])
        ax.set_title("Model Accuracy Comparison")
        ax.set_ylabel("Accuracy")
        ax.set_ylim(0, 1)
        ax.grid(axis="y", linestyle="-", linewidth=0.8)
        ax.bar_label(bars, labels=[f"{accuracy:.2%}" for accuracy in accuracies], padding=4)
        fig.tight_layout()

        path = VISUALIZATIONS_DIR / "model_accuracy.png"
        fig.savefig(path, dpi=150)
        plt.close(fig)

    return path


def save_feature_importance_plot(model: Pipeline, model_name: str) -> Path | None:
    classifier = model.named_steps.get("classifier")
    importances = getattr(classifier, "feature_importances_", None)

    if importances is None:
        return None

    importance_df = (
        pd.DataFrame({"feature": FEATURES, "importance": importances})
        .sort_values("importance", ascending=True)
        .reset_index(drop=True)
    )

    with plt.rc_context(PLOT_STYLE):
        fig, ax = plt.subplots(figsize=(8, 5))
        ax.barh(
            importance_df["feature"].str.replace("_", " ").str.title(),
            importance_df["importance"],
            color="#f97316",
        )
        ax.set_title(f"Feature Importance - {model_name.replace('_', ' ').title()}")
        ax.set_xlabel("Importance")
        ax.grid(axis="x", linestyle="-", linewidth=0.8)
        fig.tight_layout()

        path = VISUALIZATIONS_DIR / f"{model_name}_feature_importance.png"
        fig.savefig(path, dpi=150)
        plt.close(fig)

    return path


def artifact_path(path: Path) -> str:
    return path.relative_to(BASE_DIR.parent).as_posix()


def save_model_visualizations(
    trained_models: dict[str, Pipeline],
    model_predictions: dict[str, pd.Series],
    y_test: pd.Series,
) -> dict[str, dict[str, str]]:
    visualizations = {}

    for model_name, model in trained_models.items():
        model_visualizations = {
            "confusion_matrix": artifact_path(
                save_confusion_matrix_plot(
                    y_test,
                    model_predictions[model_name],
                    model_name,
                )
            )
        }

        feature_importance_path = save_feature_importance_plot(model, model_name)
        if feature_importance_path:
            model_visualizations["feature_importance"] = artifact_path(feature_importance_path)

        visualizations[model_name] = model_visualizations

    return visualizations


def train_model() -> None:
    df = load_dataset()
    VISUALIZATIONS_DIR.mkdir(exist_ok=True)

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

    trained_models = {}
    model_metrics = {}
    model_predictions = {}

    for name, candidate_model in build_models().items():
        candidate_model.fit(X_train, y_train)
        predictions = candidate_model.predict(X_test)
        accuracy = accuracy_score(y_test, predictions)
        macro_f1 = f1_score(y_test, predictions, average="macro", zero_division=0)
        report = classification_report(
            y_test,
            predictions,
            output_dict=True,
            zero_division=0,
        )

        trained_models[name] = candidate_model
        model_predictions[name] = predictions
        model_metrics[name] = {
            "accuracy": round(float(accuracy), 4),
            "macro_f1": round(float(macro_f1), 4),
            "classification_report": report,
        }

    best_model_name = max(
        model_metrics,
        key=lambda name: model_metrics[name]["macro_f1"],
    )
    model = trained_models[best_model_name]

    visualization_paths = {
        "model_accuracy": artifact_path(save_model_accuracy_plot(model_metrics)),
        "models": save_model_visualizations(trained_models, model_predictions, y_test),
    }

    artifact = {
        "model": model,
        "model_name": best_model_name,
        "models": trained_models,
        "features": FEATURES,
        "target": TARGET,
        "labels": LABELS,
    }

    joblib.dump(artifact, MODEL_PATH)

    metrics = {
        "accuracy": model_metrics[best_model_name]["accuracy"],
        "macro_f1": model_metrics[best_model_name]["macro_f1"],
        "classification_report": model_metrics[best_model_name]["classification_report"],
        "best_model": best_model_name,
        "models": model_metrics,
        "dataset_rows": int(len(df)),
        "features": FEATURES,
        "target": TARGET,
        "visualizations": visualization_paths,
    }

    METRICS_PATH.write_text(json.dumps(metrics, indent=2), encoding="utf-8")

    print("Model training completed.")
    print(f"Rows used: {len(df)}")
    print(f"Best model: {best_model_name}")
    print(f"Accuracy: {model_metrics[best_model_name]['accuracy']:.4f}")
    print(f"Macro F1: {model_metrics[best_model_name]['macro_f1']:.4f}")
    print(f"Saved model to: {MODEL_PATH}")
    print(f"Saved metrics to: {METRICS_PATH}")
    print(f"Saved visualizations to: {VISUALIZATIONS_DIR}")


if __name__ == "__main__":
    train_model()
