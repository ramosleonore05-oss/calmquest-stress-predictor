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
  Moon,
  RotateCcw,
  Send,
  Sparkles,
  Trophy,
  WifiOff,
  X,
} from "lucide-react";

const API_URL =
  import.meta.env.VITE_API_URL || "https://calmquest-stress-predictor-production.up.railway.app";
const HISTORY_KEY = "stress-predictor-history";

const initialForm = {
  sleep_quality: null,
  headaches_per_week: null,
  academic_performance: null,
  study_load: null,
  extracurricular_per_week: null,
};

const questions = [
  {
    key: "sleep_quality",
    label: "Sleep Recovery",
    question: "How refreshed do you usually feel when you wake up for school?",
    helper: "Think about the last few school days, not just one night.",
    icon: Moon,
    options: [
      { value: 1, title: "Exhausted", detail: "I wake up tired most days." },
      { value: 2, title: "Not great", detail: "I get through the morning slowly." },
      { value: 3, title: "Okay", detail: "Some days are fine, some are rough." },
      { value: 4, title: "Rested", detail: "I usually have enough energy." },
      { value: 5, title: "Fully charged", detail: "Sleep feels consistent and restorative." },
    ],
  },
  {
    key: "headaches_per_week",
    label: "Body Signals",
    question: "How often do headaches or tension show up during a normal week?",
    helper: "Physical signals can reveal pressure before it feels obvious.",
    icon: AlertCircle,
    options: [
      { value: 0, title: "Almost never", detail: "No regular headaches." },
      { value: 1, title: "Once", detail: "It happens, but it is rare." },
      { value: 2, title: "A few times", detail: "I notice it more than once." },
      { value: 3, title: "Often", detail: "Several school days are affected." },
      { value: 5, title: "Very often", detail: "It is a recurring weekly problem." },
    ],
  },
  {
    key: "academic_performance",
    label: "Academic Confidence",
    question: "How confident do you feel about your current class performance?",
    helper: "This is about how school feels right now, not your long-term ability.",
    icon: BookOpen,
    options: [
      { value: 1, title: "Falling behind", detail: "I feel lost in several subjects." },
      { value: 2, title: "Uneasy", detail: "I am keeping up with difficulty." },
      { value: 3, title: "Steady enough", detail: "My performance feels average." },
      { value: 4, title: "Confident", detail: "I understand most of my work." },
      { value: 5, title: "Strong", detail: "I feel prepared and on track." },
    ],
  },
  {
    key: "study_load",
    label: "Workload Pressure",
    question: "How heavy does your homework, studying, and exam prep feel?",
    helper: "Include assignments, deadlines, tutoring, and revision time.",
    icon: Brain,
    options: [
      { value: 1, title: "Light", detail: "I have plenty of breathing room." },
      { value: 2, title: "Manageable", detail: "Busy, but still under control." },
      { value: 3, title: "Moderate", detail: "I need a plan to keep pace." },
      { value: 4, title: "Heavy", detail: "It is hard to switch off." },
      { value: 5, title: "Overwhelming", detail: "The work feels constant." },
    ],
  },
  {
    key: "extracurricular_per_week",
    label: "Schedule Balance",
    question: "How packed is your week with clubs, sports, jobs, or other activities?",
    helper: "The healthiest range is usually enough activity without losing recovery time.",
    icon: Trophy,
    options: [
      { value: 0, title: "None", detail: "School takes almost all my energy." },
      { value: 1, title: "One activity", detail: "A small amount outside class." },
      { value: 2, title: "Balanced", detail: "A few things that fit well." },
      { value: 4, title: "Busy", detail: "My calendar is crowded." },
      { value: 5, title: "Packed", detail: "Activities compete with sleep or study." },
    ],
  },
];

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

function scoreQuestion(question, value) {
  if (question.key === "sleep_quality" || question.key === "academic_performance") {
    return ((value - 1) / 4) * 100;
  }

  if (question.key === "headaches_per_week" || question.key === "study_load") {
    return ((5 - value) / 5) * 100;
  }

  return Math.max(0, 100 - Math.abs(value - 2) * 25);
}

function formatPercent(value) {
  return `${Math.round((value || 0) * 100)}%`;
}

function getSelectedOption(question, value) {
  return question.options.find((option) => option.value === value) || null;
}

export default function App() {
  const [view, setView] = useState("questions");
  const [form, setForm] = useState(initialForm);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState(readHistory);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");

  const answeredCount = questions.filter((question) => form[question.key] !== null).length;
  const isComplete = answeredCount === questions.length;
  const progress = Math.round((answeredCount / questions.length) * 100);

  const readinessScore = useMemo(() => {
    const answeredQuestions = questions.filter((question) => form[question.key] !== null);
    if (answeredQuestions.length === 0) return 0;

    const total = answeredQuestions.reduce((sum, question) => sum + scoreQuestion(question, form[question.key]), 0);
    return Math.round(total / answeredQuestions.length);
  }, [form]);

  const pressurePoints = useMemo(() => {
    return questions
      .filter((question) => form[question.key] !== null)
      .map((question) => ({
        ...question,
        score: scoreQuestion(question, form[question.key]),
        selected: getSelectedOption(question, form[question.key]),
      }))
      .sort((a, b) => a.score - b.score)
      .slice(0, 2);
  }, [form]);

  function updateField(key, value) {
    setForm((current) => ({
      ...current,
      [key]: Number(value),
    }));
    setResult(null);
    setApiError("");
  }

  function saveHistoryItem(data) {
    const item = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      form,
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
        body: JSON.stringify(form),
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
    setForm(initialForm);
    setResult(null);
    setApiError("");
    setView("questions");
  }

  function clearHistory() {
    setHistory([]);
    localStorage.removeItem(HISTORY_KEY);
  }

  function applyHistoryItem(item) {
    setForm(item.form);
    setResult(item.result);
    setApiError("");
    setView("review");
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
          </div>
        </header>

        <nav className="tabs" aria-label="App sections">
          <button
            type="button"
            className={view === "questions" ? "tab-button active" : "tab-button"}
            onClick={() => setView("questions")}
          >
            <ClipboardList size={18} />
            Questions
          </button>
          <button
            type="button"
            className={view === "review" ? "tab-button active" : "tab-button"}
            onClick={() => setView("review")}
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
              <strong>{point.selected?.title}</strong>
            </div>
          ))}
        </section>

        {view === "questions" && (
          <form className="panel questions-page" onSubmit={(event) => event.preventDefault()}>
            <div className="panel-heading">
              <div>
                <p>First Page</p>
                <h2>Answer The Questions</h2>
              </div>
              <button type="button" className="icon-button" onClick={resetForm} title="Reset check-in">
                <RotateCcw size={18} />
              </button>
            </div>

            <div className="progress-track" aria-label="Question progress">
              <span style={{ width: `${progress}%` }} />
            </div>

            <div className="questions-list">
              {questions.map((question) => (
                <article className="question-block" key={question.key}>
                  <div className="question-card">
                    <div className="question-icon">
                      <question.icon size={22} />
                    </div>
                    <div>
                      <strong>{question.label}</strong>
                      <h3>{question.question}</h3>
                      <p>{question.helper}</p>
                    </div>
                  </div>

                  <div className="answer-grid">
                    {question.options.map((option) => (
                      <button
                        type="button"
                        className={form[question.key] === option.value ? "answer-option selected" : "answer-option"}
                        key={`${question.key}-${option.value}`}
                        onClick={() => updateField(question.key, option.value)}
                      >
                        <strong>{option.title}</strong>
                        <span>{option.detail}</span>
                      </button>
                    ))}
                  </div>
                </article>
              ))}
            </div>

            <div className="actions">
              <button type="button" className="primary-action" disabled={!isComplete} onClick={() => setView("review")}>
                Review Answers
                <ArrowRight size={18} />
              </button>
            </div>
          </form>
        )}

        {view === "review" && (
          <section className="review-layout">
            <form className="panel review-panel" onSubmit={handleSubmit}>
              <div className="panel-heading">
                <div>
                  <p>Second Page</p>
                  <h2>Answer Review</h2>
                </div>
                <button type="button" className="secondary-action compact-button" onClick={() => setView("questions")}>
                  <ArrowLeft size={18} />
                  Edit
                </button>
              </div>

              <div className="insight-list">
                {questions.map((question) => {
                  const selected = getSelectedOption(question, form[question.key]);
                  return (
                    <article className="insight-card" key={question.key}>
                      <strong>{question.label}</strong>
                      <span>{selected ? selected.title : "Not answered"}</span>
                      <p>{selected ? selected.detail : "Go back and choose an answer."}</p>
                    </article>
                  );
                })}
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
                  <p>Review your answers, then tap Predict Stress.</p>
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
                  </div>

                  <h3>{result.stress_label}</h3>
                  <p>{result.recommendation}</p>

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
      </section>
    </main>
  );
}
