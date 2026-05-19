import { useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BookOpen,
  Brain,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  History,
  Info,
  Moon,
  RotateCcw,
  Send,
  Sparkles,
  Timer,
  Trophy,
  Users,
  WifiOff,
  X,
} from "lucide-react";

const API_URL =
  import.meta.env.VITE_API_URL || "https://calmquest-stress-predictor-production.up.railway.app";
const HISTORY_KEY = "stress-predictor-history";

const questions = [
  {
    key: "sleep_quality",
    featureKey: "sleep_quality",
    label: "Sleep Recovery",
    question: "How refreshed do you usually feel when you wake up for school?",
    helper: "Think about the last few school days, not just one night.",
    volumeLabel: "Recovery volume",
    volumeLow: "Drained",
    volumeHigh: "Restored",
    direction: "protective",
    icon: Moon,
  },
  {
    key: "headaches_per_week",
    featureKey: "headaches_per_week",
    label: "Body Signals",
    question: "How often do headaches or tension show up during a normal week?",
    helper: "Physical signals can reveal pressure before it feels obvious.",
    volumeLabel: "Body pressure",
    volumeLow: "Quiet",
    volumeHigh: "Loud",
    direction: "pressure",
    icon: AlertCircle,
  },
  {
    key: "academic_performance",
    featureKey: "academic_performance",
    label: "Academic Confidence",
    question: "How confident do you feel about your current class performance?",
    helper: "This is about how school feels right now, not your long-term ability.",
    volumeLabel: "Confidence volume",
    volumeLow: "Unsure",
    volumeHigh: "Prepared",
    direction: "protective",
    icon: BookOpen,
  },
  {
    key: "study_load",
    featureKey: "study_load",
    label: "Workload Pressure",
    question: "How heavy does your homework, studying, and exam prep feel?",
    helper: "Include assignments, deadlines, tutoring, and revision time.",
    volumeLabel: "Workload volume",
    volumeLow: "Light",
    volumeHigh: "Maxed",
    direction: "pressure",
    icon: Brain,
  },
  {
    key: "extracurricular_per_week",
    featureKey: "extracurricular_per_week",
    label: "Schedule Balance",
    question: "How packed is your week with clubs, sports, jobs, or other activities?",
    helper: "The healthiest range is usually enough activity without losing recovery time.",
    volumeLabel: "Schedule volume",
    volumeLow: "Empty",
    volumeHigh: "Packed",
    direction: "pressure",
    icon: Trophy,
  },
  {
    key: "emotional_pressure",
    featureKey: "study_load",
    label: "Emotional Pressure",
    question: "What feelings show up most often when you think about school lately?",
    helper: "Mention worry, pressure, motivation, calm, or anything else that feels relevant.",
    volumeLabel: "Emotion volume",
    volumeLow: "Calm",
    volumeHigh: "Intense",
    direction: "pressure",
    icon: Sparkles,
  },
  {
    key: "focus_energy",
    featureKey: "academic_performance",
    label: "Focus Energy",
    question: "How easy or hard is it to focus during class and while studying?",
    helper: "Describe attention, motivation, distractions, and mental energy.",
    volumeLabel: "Focus volume",
    volumeLow: "Scattered",
    volumeHigh: "Locked in",
    direction: "protective",
    icon: Brain,
  },
  {
    key: "deadline_pressure",
    featureKey: "study_load",
    label: "Deadline Pressure",
    question: "How do deadlines, exams, or unfinished tasks affect your week?",
    helper: "Think about whether tasks feel planned, rushed, or constantly piling up.",
    volumeLabel: "Deadline volume",
    volumeLow: "Clear",
    volumeHigh: "Piling up",
    direction: "pressure",
    icon: Timer,
  },
  {
    key: "support_system",
    featureKey: "academic_performance",
    label: "Support System",
    question: "Who can you talk to when school feels stressful, and how helpful is that support?",
    helper: "Include friends, family, teachers, classmates, counselors, or feeling alone.",
    volumeLabel: "Support volume",
    volumeLow: "Alone",
    volumeHigh: "Supported",
    direction: "protective",
    icon: Users,
  },
  {
    key: "recovery_breaks",
    featureKey: "sleep_quality",
    label: "Recovery Breaks",
    question: "How much real downtime do you get after schoolwork and responsibilities?",
    helper: "Describe breaks, hobbies, quiet time, screen time, or whether rest gets skipped.",
    volumeLabel: "Recharge volume",
    volumeLow: "Empty",
    volumeHigh: "Recharged",
    direction: "protective",
    icon: Moon,
  },
];

const modelFeatureKeys = [
  "sleep_quality",
  "headaches_per_week",
  "academic_performance",
  "study_load",
  "extracurricular_per_week",
];

const initialVolumes = Object.fromEntries(questions.map((question) => [question.key, 50]));
const initialTouched = Object.fromEntries(questions.map((question) => [question.key, false]));

const featureLabels = {
  sleep_quality: ["Drained", "Tired", "Uneven", "Rested", "Restorative"],
  headaches_per_week: ["Rare", "Occasional", "Repeated", "Frequent", "Very frequent", "Nearly daily"],
  academic_performance: ["Falling behind", "Uneasy", "Steady", "Confident", "Strong"],
  study_load: ["Light", "Manageable", "Moderate", "Heavy", "Overwhelming"],
  extracurricular_per_week: ["None", "Light", "Balanced", "Active", "Busy", "Packed"],
};

const stressLevelDescriptions = {
  1: "Very low stress: your current school pressure looks light and manageable.",
  2: "Low stress: there may be some pressure, but your profile still looks mostly balanced.",
  3: "Moderate stress: several signals suggest pressure is building and needs attention.",
  4: "High stress: school demands may be affecting your energy, focus, or recovery.",
  5: "Very high stress: your profile suggests strong pressure and support should be prioritized.",
};

function readHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
  } catch {
    return [];
  }
}

function getResultClass(level) {
  if (!level) return "";
  if (level <= 2) return "low";
  if (level === 3) return "moderate";
  return "high";
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function volumeToFeatureValue(question, volume) {
  const value = Number(volume);

  if (question.featureKey === "headaches_per_week" || question.featureKey === "extracurricular_per_week") {
    return clamp(Math.round(value / 20), 0, 5);
  }

  if (question.direction === "protective") {
    return clamp(Math.round(value / 25) + 1, 1, 5);
  }

  return clamp(Math.round(value / 25) + 1, 1, 5);
}

function buildModelInput(volumeValues) {
  const buckets = Object.fromEntries(modelFeatureKeys.map((key) => [key, []]));

  questions.forEach((question) => {
    buckets[question.featureKey].push(volumeToFeatureValue(question, volumeValues[question.key]));
  });

  return Object.fromEntries(
    modelFeatureKeys.map((key) => {
      const values = buckets[key];
      const fallback = key === "headaches_per_week" || key === "extracurricular_per_week" ? 0 : 3;
      const average = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : fallback;
      const min = key === "headaches_per_week" || key === "extracurricular_per_week" ? 0 : 1;
      return [key, clamp(Math.round(average), min, 5)];
    })
  );
}

function getStressVolume(volumeValues, touchedValues) {
  const answeredQuestions = questions.filter((question) => touchedValues[question.key]);
  if (answeredQuestions.length === 0) return 0;

  const total = answeredQuestions.reduce((sum, question) => {
    const value = Number(volumeValues[question.key] || 0);
    return sum + (question.direction === "protective" ? 100 - value : value);
  }, 0);

  return Math.round(total / answeredQuestions.length);
}

function scoreQuestion(question, value) {
  const key = question.featureKey || question.key;

  if (key === "sleep_quality" || key === "academic_performance") {
    return ((value - 1) / 4) * 100;
  }

  if (key === "headaches_per_week" || key === "study_load") {
    return ((5 - value) / 5) * 100;
  }

  return Math.max(0, 100 - Math.abs(value - 2) * 25);
}

function formatPercent(value) {
  return `${Math.round((value || 0) * 100)}%`;
}

function getVolumeLabel(question, volume) {
  const featureValue = volumeToFeatureValue(question, volume);
  const labels = featureLabels[question.featureKey] || [];
  return labels[featureValue - (question.featureKey === "headaches_per_week" || question.featureKey === "extracurricular_per_week" ? 0 : 1)] || "Interpreted";
}

function getStressLevelDescription(level) {
  return stressLevelDescriptions[level] || "This level summarizes the stress pattern detected from your volume profile.";
}

export default function App() {
  const [hasStarted, setHasStarted] = useState(false);
  const [view, setView] = useState("checkin");
  const [step, setStep] = useState(0);
  const [volumes, setVolumes] = useState(initialVolumes);
  const [touched, setTouched] = useState(initialTouched);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState(readHistory);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");

  const interpretedInput = useMemo(() => buildModelInput(volumes), [volumes]);
  const stressVolume = useMemo(() => getStressVolume(volumes, touched), [volumes, touched]);
  const answeredCount = questions.filter((question) => touched[question.key]).length;
  const isComplete = answeredCount === questions.length;
  const progress = Math.round((answeredCount / questions.length) * 100);
  const currentQuestion = questions[step];
  const currentVolume = volumes[currentQuestion.key];

  const readinessScore = useMemo(() => {
    const answeredQuestions = questions.filter((question) => touched[question.key]);
    if (answeredQuestions.length === 0) return 0;

    const total = answeredQuestions.reduce((sum, question) => sum + scoreQuestion(question, interpretedInput[question.featureKey]), 0);
    return Math.round(total / answeredQuestions.length);
  }, [interpretedInput, touched]);

  const pressurePoints = useMemo(() => {
    return questions
      .filter((question) => touched[question.key])
      .map((question) => ({
        ...question,
        score: scoreQuestion(question, interpretedInput[question.featureKey]),
        interpreted: getVolumeLabel(question, volumes[question.key]),
      }))
      .sort((a, b) => a.score - b.score)
      .slice(0, 2);
  }, [interpretedInput, touched, volumes]);

  function updateVolume(key, value) {
    setVolumes((current) => ({
      ...current,
      [key]: Number(value),
    }));
    markTouched(key);
    setResult(null);
    setApiError("");
  }

  function markTouched(key) {
    setTouched((current) => ({
      ...current,
      [key]: true,
    }));
  }

  function goToNextQuestion() {
    setStep((value) => Math.min(questions.length - 1, value + 1));
  }

  function goToReview() {
    if (isComplete) {
      setView("review");
    }
  }

  function saveHistoryItem(data) {
    const item = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      volumes,
      result: data,
    };
    const nextHistory = [item, ...history].slice(0, 8);
    setHistory(nextHistory);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(nextHistory));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!isComplete) return;

    setLoading(true);
    setApiError("");
    setResult(null);

    try {
      const response = await fetch(`${API_URL}/predict`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(interpretedInput),
      });

      if (!response.ok) {
        throw new Error("Prediction request failed. Please check the backend deployment.");
      }

      const data = await response.json();
      setResult(data);
      saveHistoryItem(data);
      setView("review");
    } catch (error) {
      setApiError(error.message);
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setVolumes(initialVolumes);
    setTouched(initialTouched);
    setResult(null);
    setApiError("");
    setStep(0);
    setView("checkin");
  }

  function clearHistory() {
    setHistory([]);
    localStorage.removeItem(HISTORY_KEY);
  }

  function applyHistoryItem(item) {
    setVolumes({
      ...initialVolumes,
      ...(item.volumes || {}),
    });
    setTouched(Object.fromEntries(questions.map((question) => [question.key, true])));
    setResult(item.result);
    setApiError("");
    setView("review");
  }

  if (!hasStarted) {
    return (
      <main className="landing-page">
        <section className="landing-hero">
          <img className="landing-logo" src="/CalmQuest-logo-removebg-preview.png" alt="CalmQuest" />
          <div className="landing-copy">
            <h1>CalmQuest</h1>
            <p>A quick student check-in that turns everyday school pressure into a clear stress profile.</p>
          </div>
          <button type="button" className="start-button" onClick={() => setHasStarted(true)}>
            Start Check-In
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="page">
      <section className="app-shell">
        <header className="topbar">
          <div>
            <div className="eyebrow">
              <img className="brand-mark" src="/CalmQuest-logo-removebg-preview.png" alt="" />
              CalmQuest
            </div>
            <h1>Student Stress Check-In</h1>
          </div>

          <div className="topbar-metrics">
            <div>
              <span>Progress</span>
              <strong>{progress}%</strong>
            </div>
            <div>
              <span>Readiness</span>
              <strong>{readinessScore}%</strong>
            </div>
            <div>
              <span>Stress Volume</span>
              <strong>{stressVolume}%</strong>
            </div>
          </div>
        </header>

        <nav className="tabs" aria-label="App sections">
          <button
            type="button"
            className={view === "checkin" ? "tab-button active" : "tab-button"}
            onClick={() => setView("checkin")}
          >
            <ClipboardList size={18} />
            Check-In
          </button>
          <button
            type="button"
            className={view === "review" ? "tab-button active" : "tab-button"}
            onClick={goToReview}
            disabled={!isComplete}
            title={isComplete ? "Review volumes" : "Set all volume controls first"}
          >
            <BarChart3 size={18} />
            Review
          </button>
          <button
            type="button"
            className={view === "history" ? "tab-button active" : "tab-button"}
            onClick={() => setView("history")}
          >
            <History size={18} />
            History
          </button>
          <button
            type="button"
            className={view === "info" ? "tab-button active" : "tab-button"}
            onClick={() => setView("info")}
          >
            <Info size={18} />
            Info
          </button>
        </nav>

        <section className="insight-strip">
          <div>
            <Sparkles size={18} />
            <span>Profile</span>
            <strong>{answeredCount === 0 ? "Not started" : readinessScore >= 70 ? "Stable" : readinessScore >= 45 ? "Mixed" : "Strained"}</strong>
          </div>
          {pressurePoints.map((point) => (
            <div key={point.key}>
              <point.icon size={18} />
              <span>{point.label}</span>
              <strong>{point.interpreted}</strong>
            </div>
          ))}
        </section>

        {view === "checkin" && (
          <form className="panel questions-page" onSubmit={(event) => event.preventDefault()}>
            <div className="panel-heading">
              <div>
                <p>Question {step + 1} of {questions.length}</p>
                <h2>{currentQuestion.label}</h2>
              </div>
              <button type="button" className="icon-button" onClick={resetForm} title="Reset check-in">
                <RotateCcw size={18} />
              </button>
            </div>

            <div className="progress-track" aria-label="Question progress">
              <span style={{ width: `${progress}%` }} />
            </div>

            <article className="question-block">
              <div className="question-card">
                <div className="question-icon">
                  <currentQuestion.icon size={22} />
                </div>
                <div>
                  <strong>{currentQuestion.label}</strong>
                  <h3>{currentQuestion.question}</h3>
                  <p>{currentQuestion.helper}</p>
                </div>
              </div>

              <div className="volume-only">
                <label className="volume-control">
                  <div>
                    <span>{currentQuestion.volumeLabel}</span>
                    <strong>{currentVolume}%</strong>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={currentVolume}
                    onChange={(event) => updateVolume(currentQuestion.key, event.target.value)}
                    aria-label={currentQuestion.volumeLabel}
                  />
                  <div className="volume-labels">
                    <span>{currentQuestion.volumeLow}</span>
                    <span>{currentQuestion.volumeHigh}</span>
                  </div>
                </label>
                <div className="volume-summary">
                  <span>Current signal</span>
                  <strong>{getVolumeLabel(currentQuestion, currentVolume)}</strong>
                </div>
              </div>
            </article>

            <div className="actions split-actions">
              <button
                type="button"
                className="secondary-action"
                disabled={step === 0}
                onClick={() => setStep((value) => Math.max(0, value - 1))}
              >
                <ArrowLeft size={18} />
                Back
              </button>

              {step < questions.length - 1 ? (
                <button
                  type="button"
                  className="primary-action"
                  disabled={!touched[currentQuestion.key]}
                  onClick={goToNextQuestion}
                  title={touched[currentQuestion.key] ? "Next question" : "Slide the volume first"}
                >
                  Next
                  <ArrowRight size={18} />
                </button>
              ) : (
                <button
                  type="button"
                  className="primary-action"
                  disabled={!touched[currentQuestion.key]}
                  onClick={goToReview}
                  title={touched[currentQuestion.key] ? "Review volumes" : "Slide the volume first"}
                >
                  Review Volumes
                  <ArrowRight size={18} />
                </button>
              )}
            </div>
          </form>
        )}

        {view === "review" && (
          <section className="review-layout">
            <form className="panel review-panel" onSubmit={handleSubmit}>
              <div className="panel-heading">
                <div>
                  <p>Second Page</p>
                  <h2>Volume Review</h2>
                </div>
                <button type="button" className="secondary-action compact-button" onClick={() => setView("checkin")}>
                  <ArrowLeft size={18} />
                  Edit
                </button>
              </div>

              <div className="insight-list">
                {questions.map((question) => (
                  <article className="insight-card" key={question.key}>
                    <strong>{question.label}</strong>
                    <span>{touched[question.key] ? getVolumeLabel(question, volumes[question.key]) : "Not set"}</span>
                    <p>{question.volumeLow} to {question.volumeHigh}</p>
                    <small>{question.volumeLabel}: {volumes[question.key]}%</small>
                  </article>
                ))}
              </div>

              <div className="actions">
                <button type="submit" className="primary-action" disabled={loading || !isComplete}>
                  <Send size={18} />
                  {loading ? "Predicting" : "Predict Stress"}
                </button>
              </div>
            </form>

            <aside className="panel result-panel">
              <div className="panel-heading">
                <div>
                  <p>Prediction</p>
                  <h2>Stress Profile</h2>
                </div>
                <Brain size={28} />
              </div>

              {!result && !apiError && (
                <div className="empty-state">
                  <BarChart3 size={40} />
                  <p>Review your volume settings, then tap Predict Stress.</p>
                </div>
              )}

              {apiError && (
                <div className="error-box">
                  <WifiOff size={22} />
                  <div>
                    <strong>Backend Error</strong>
                    <p>{apiError}</p>
                  </div>
                </div>
              )}

              {result && (
                <div className={`result ${getResultClass(result.predicted_stress_level)}`}>
                  <div className="score-row">
                    <div>
                      <span>Stress Level</span>
                      <strong>{result.predicted_stress_level}</strong>
                    </div>
                    <div>
                      <span>Confidence</span>
                      <strong>{formatPercent(result.confidence)}</strong>
                    </div>
                    <div>
                      <span>Stress Volume</span>
                      <strong>{stressVolume}%</strong>
                    </div>
                  </div>

                  <h3>{result.stress_label}</h3>
                  <p className="level-description">{getStressLevelDescription(result.predicted_stress_level)}</p>
                  <p>{result.recommendation}</p>

                  <div className="level-guide">
                    <h4>Stress Level Guide</h4>
                    {Object.entries(stressLevelDescriptions).map(([level, description]) => (
                      <div className={Number(level) === result.predicted_stress_level ? "level-guide-item active" : "level-guide-item"} key={level}>
                        <span>{level}</span>
                        <p>{description}</p>
                      </div>
                    ))}
                  </div>

                  <div className="probability-list">
                    {result.probability_bands?.map((band) => (
                      <div className="probability-row" key={band.level}>
                        <span>{band.level}</span>
                        <div>
                          <i style={{ width: formatPercent(band.probability) }} />
                        </div>
                        <strong>{formatPercent(band.probability)}</strong>
                      </div>
                    ))}
                  </div>

                  <div className="action-plan">
                    <h4>
                      <ClipboardList size={18} />
                      Action Plan
                    </h4>
                    {result.action_plan?.map((action) => (
                      <div className="action-item" key={action}>
                        <CheckCircle2 size={17} />
                        <span>{action}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </aside>
          </section>
        )}

        {view === "history" && (
          <section className="panel history-panel">
            <div className="panel-heading">
              <div>
                <p>Saved On This Device</p>
                <h2>History</h2>
              </div>
              {history.length > 0 && (
                <button type="button" className="icon-button" onClick={clearHistory} title="Clear history">
                  <X size={18} />
                </button>
              )}
            </div>

            {history.length === 0 ? (
              <div className="empty-mini">
                <CalendarClock size={24} />
                <span>No saved predictions yet.</span>
              </div>
            ) : (
              <div className="history-list">
                {history.map((item) => (
                  <button type="button" className="history-item" key={item.id} onClick={() => applyHistoryItem(item)}>
                    <span>{new Date(item.createdAt).toLocaleString()}</span>
                    <strong>{item.result.stress_label}</strong>
                    <small>
                      Level {item.result.predicted_stress_level} - {formatPercent(item.result.confidence)}
                    </small>
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

        {view === "info" && (
          <section className="panel info-panel">
            <div className="panel-heading">
              <div>
                <p>Guide</p>
                <h2>Information</h2>
              </div>
              <Info size={28} />
            </div>

            <div className="info-grid">
              <article className="info-card">
                <strong>Landing Page</strong>
                <p>The opening screen introduces CalmQuest and starts the student stress check-in.</p>
              </article>
              <article className="info-card">
                <strong>Check-In Tab</strong>
                <p>Shows one question at a time so the form feels smaller on mobile phones.</p>
              </article>
              <article className="info-card">
                <strong>Question Progress</strong>
                <p>The progress percentage shows how many of the ten volume controls have been set.</p>
              </article>
              <article className="info-card">
                <strong>Stress Volume</strong>
                <p>Each question uses a 0 to 100 volume control, so responses can show small, medium, or intense pressure instead of only broad levels.</p>
              </article>
              <article className="info-card">
                <strong>Readiness Score</strong>
                <p>A quick wellness-style score based on the volume controls. Higher means the profile looks more balanced.</p>
              </article>
              <article className="info-card">
                <strong>Live Profile</strong>
                <p>The profile chip changes from Not started to Stable, Mixed, or Strained as volumes are set.</p>
              </article>
              <article className="info-card">
                <strong>Pressure Points</strong>
                <p>The small chips highlight answered areas that currently look least balanced.</p>
              </article>
              <article className="info-card">
                <strong>Review Tab</strong>
                <p>Unlocks only after all questions are answered. It lets you check every answer before predicting.</p>
              </article>
              <article className="info-card">
                <strong>Predict Stress Button</strong>
                <p>Converts the volume controls into model-ready signals, then returns the stress prediction.</p>
              </article>
              <article className="info-card">
                <strong>Stress Profile</strong>
                <p>Shows the predicted stress level, confidence percentage, recommendation, and probability bars.</p>
              </article>
              <article className="info-card">
                <strong>Action Plan</strong>
                <p>Lists practical next steps based on the predicted stress level and volume profile.</p>
              </article>
              <article className="info-card">
                <strong>History Tab</strong>
                <p>Saves recent predictions in this browser so a previous result can be opened again.</p>
              </article>
              <article className="info-card">
                <strong>Reset Button</strong>
                <p>Clears the current volume settings and prediction so a new check-in can start from the first question.</p>
              </article>
              <article className="info-card caution">
                <strong>Important Note</strong>
                <p>This is an awareness tool, not a medical diagnosis. If stress feels severe or unsafe, talk to a trusted adult, counselor, adviser, or health professional.</p>
              </article>
            </div>
          </section>
        )}
      </section>
    </main>
  );
}
