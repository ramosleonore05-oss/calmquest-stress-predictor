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
  Trophy,
  WifiOff,
  X,
} from "lucide-react";

<<<<<<< HEAD
const API_URL =
  import.meta.env.VITE_API_URL ||
  (["localhost", "127.0.0.1"].includes(window.location.hostname) && window.location.port !== "8000"
    ? `${window.location.protocol}//${window.location.hostname}:8000`
    : window.location.origin);
=======
const API_URL = `${window.location.protocol}//${window.location.hostname}:8000`;
>>>>>>> 65a61467272ef9ae535890d2039e3c1f6dba6ea3
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
  const [hasStarted, setHasStarted] = useState(false);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(initialForm);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState(readHistory);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");
  const [showHistory, setShowHistory] = useState(true);
  const [activeTab, setActiveTab] = useState("checkin");

  const currentQuestion = questions[step];
  const answeredCount = questions.filter((question) => form[question.key] !== null).length;
  const currentAnswer = form[currentQuestion.key];
  const isCurrentAnswered = currentAnswer !== null;
  const isComplete = answeredCount === questions.length;
  const progress = Math.round((answeredCount / questions.length) * 100);

  const readinessScore = useMemo(() => {
    const answeredQuestions = questions.filter((question) => form[question.key] !== null);
    if (answeredQuestions.length === 0) {
      return 0;
    }

    const total = answeredQuestions.reduce((sum, question) => sum + scoreQuestion(question, form[question.key]), 0);
    return Math.round(total / answeredQuestions.length);
  }, [form]);

  const pressurePoints = useMemo(() => {
    return questions
      .filter((question) => form[question.key] !== null)
      .map((question) => ({
        ...question,
        score: scoreQuestion(question, form[question.key]),
        value: form[question.key],
        selected: getSelectedOption(question, form[question.key]),
      }))
      .sort((a, b) => a.score - b.score)
      .slice(0, 2);
  }, [form]);

  const answeredQuestions = useMemo(() => {
    return questions
      .map((question) => ({
        ...question,
        selected: getSelectedOption(question, form[question.key]),
      }))
      .filter((question) => question.selected);
  }, [form]);

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

  function updateField(key, value) {
    setForm((current) => ({
      ...current,
      [key]: Number(value),
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!isComplete) {
      return;
    }

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
        throw new Error("Prediction request failed. Make sure the FastAPI backend is running.");
      }

      const data = await response.json();
      setResult(data);
      saveHistoryItem(data);
    } catch (error) {
      setApiError(error.message);
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setStep(0);
    setForm(initialForm);
    setResult(null);
    setApiError("");
  }

  function clearHistory() {
    setHistory([]);
    localStorage.removeItem(HISTORY_KEY);
  }

  function applyHistoryItem(item) {
    setForm(item.form);
    setResult(item.result);
    setStep(questions.length - 1);
    setApiError("");
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
          </div>
        </header>

        <nav className="tabs" aria-label="App sections">
          <button
            type="button"
            className={activeTab === "checkin" ? "tab-button active" : "tab-button"}
            onClick={() => setActiveTab("checkin")}
          >
            <ClipboardList size={18} />
            Check-In
          </button>
          <button
            type="button"
            className={activeTab === "info" ? "tab-button active" : "tab-button"}
            onClick={() => setActiveTab("info")}
          >
            <Info size={18} />
            Information
          </button>
        </nav>

        {activeTab === "info" ? (
          <section className="info-panel panel">
            <div className="panel-heading">
              <div>
                <p>Guide</p>
                <h2>How CalmQuest Works</h2>
              </div>
              <Info size={28} />
            </div>

            <div className="info-grid">
              <article className="info-card">
                <strong>Questionnaire</strong>
                <p>Answer five student-life questions about sleep, headaches, academic confidence, workload, and activities. Each answer becomes a number used by the stress prediction model.</p>
              </article>
              <article className="info-card">
                <strong>Progress</strong>
                <p>Shows how many questions you have answered. Results stay locked until all five questions are complete.</p>
              </article>
              <article className="info-card">
                <strong>Readiness</strong>
                <p>A quick wellness-style score based on your current answers. Higher means your answers look more balanced or protective.</p>
              </article>
              <article className="info-card">
                <strong>Live Profile</strong>
                <p>Summarizes your current check-in as Not started, Stable, Mixed, or Strained. It updates as answers are selected.</p>
              </article>
              <article className="info-card">
                <strong>Pressure Points</strong>
                <p>The small chips beside Live profile show the answered areas that currently look most stressful or least balanced.</p>
              </article>
              <article className="info-card">
                <strong>Stress Level</strong>
                <p>The main result is the model prediction from 1 to 5. Level 1 is very low stress, level 3 is moderate stress, and level 5 is very high stress.</p>
              </article>
              <article className="info-card">
                <strong>Confidence</strong>
                <p>Shows the model's strongest probability for the predicted stress level. A lower confidence means nearby stress levels may also be plausible.</p>
              </article>
              <article className="info-card">
                <strong>Probability Bars</strong>
                <p>Each bar shows how likely the model thinks each stress level is. The longest bar usually matches the predicted stress level.</p>
              </article>
              <article className="info-card">
                <strong>Action Plan</strong>
                <p>Gives practical next steps based on the stress level and the strongest pressure points in your answers.</p>
              </article>
              <article className="info-card">
                <strong>Your Answers</strong>
                <p>Reviews only the questions you have already answered, so you can check your choices before submitting.</p>
              </article>
              <article className="info-card">
                <strong>Session History</strong>
                <p>Saves recent predictions in this browser only. Use it to revisit a previous result during the same device/browser session.</p>
              </article>
              <article className="info-card caution">
                <strong>Important Note</strong>
                <p>This app is a learning and awareness tool, not a medical diagnosis. If stress feels severe, persistent, or unsafe, talk with a trusted adult, counselor, adviser, or health professional.</p>
              </article>
            </div>
          </section>
        ) : (
          <>

        <section className="insight-strip">
          <div>
            <Sparkles size={18} />
            <span>Live profile</span>
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

        <section className="workspace">
          <form className="panel form-panel" onSubmit={handleSubmit}>
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

            <div className="question-card">
              <div className="question-icon">
                <currentQuestion.icon size={28} />
              </div>
              <div>
                <h3>{currentQuestion.question}</h3>
                <p>{currentQuestion.helper}</p>
              </div>
            </div>

            <div className="answer-grid">
              {currentQuestion.options.map((option) => (
                <button
                  type="button"
                  className={currentAnswer === option.value ? "answer-option selected" : "answer-option"}
                  key={`${currentQuestion.key}-${option.value}`}
                  onClick={() => updateField(currentQuestion.key, option.value)}
                >
                  <strong>{option.title}</strong>
                  <span>{option.detail}</span>
                </button>
              ))}
            </div>

            <div className="actions">
              <button
                type="button"
                className="secondary-action"
                onClick={() => setStep((value) => Math.max(0, value - 1))}
                disabled={step === 0}
              >
                <ArrowLeft size={18} />
                Back
              </button>

              {step < questions.length - 1 ? (
                <button
                  type="button"
                  className="primary-action"
                  disabled={!isCurrentAnswered}
                  onClick={() => setStep((value) => Math.min(questions.length - 1, value + 1))}
                >
                  Next
                  <ArrowRight size={18} />
                </button>
              ) : (
                <button type="submit" className="primary-action" disabled={loading || !isComplete}>
                  <Send size={18} />
                  {loading ? "Predicting" : "See Results"}
                </button>
              )}

              <button type="button" className="secondary-action" onClick={() => setShowHistory((value) => !value)}>
                <History size={18} />
                History
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
                <BarChart3 size={56} />
                <p>Answer the check-in questions to see your predicted stress level, confidence, and action plan.</p>
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
                    <span>Predicted Stress Level</span>
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

        <section className="details-grid">
          <div className="panel">
            <div className="panel-heading">
              <div>
                <p>Review</p>
                <h2>Your Answers</h2>
              </div>
            </div>

            {answeredQuestions.length === 0 ? (
              <div className="empty-mini">
                <ClipboardList size={24} />
                <span>Your answered questions will appear here.</span>
              </div>
            ) : (
              <div className="insight-list">
                {answeredQuestions.map((question) => (
                  <article className="insight-card" key={question.key}>
                    <strong>{question.label}</strong>
                    <span>{question.selected.title}</span>
                    <p>{question.selected.detail}</p>
                  </article>
                ))}
              </div>
            )}
          </div>

          {showHistory && (
            <div className="panel history-panel">
              <div className="panel-heading">
                <div>
                  <p>Local Browser</p>
                  <h2>Session History</h2>
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
                      <small>Level {item.result.predicted_stress_level} - {formatPercent(item.result.confidence)}</small>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
          </>
        )}
      </section>
    </main>
  );
}
