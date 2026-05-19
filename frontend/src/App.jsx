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
    placeholder: "Example: I usually sleep around 6 hours and still wake up tired before class.",
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
    placeholder: "Example: I get headaches two or three times a week, usually after long study days.",
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
    placeholder: "Example: I understand some topics, but I am behind in math and worried about exams.",
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
    placeholder: "Example: My homework and exam prep feel constant, and I rarely finish before bedtime.",
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
    placeholder: "Example: I have basketball three days a week and a club meeting, so my evenings are busy.",
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
    placeholder: "Example: I feel worried before tests and tense when I see unfinished tasks.",
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
    placeholder: "Example: I can focus for short periods, then I get distracted and reread the same notes.",
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
    placeholder: "Example: Deadlines pile up near the end of the week, and I rush most assignments.",
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
    placeholder: "Example: I can talk to one friend, but I do not usually ask teachers for help.",
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
    placeholder: "Example: I take short phone breaks, but I do not feel fully rested after them.",
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

const initialForm = Object.fromEntries(questions.map((question) => [question.key, ""]));
const initialVolumes = Object.fromEntries(questions.map((question) => [question.key, 50]));

const featureLabels = {
  sleep_quality: ["Drained", "Tired", "Uneven", "Rested", "Restorative"],
  headaches_per_week: ["Rare", "Occasional", "Repeated", "Frequent", "Very frequent", "Nearly daily"],
  academic_performance: ["Falling behind", "Uneasy", "Steady", "Confident", "Strong"],
  study_load: ["Light", "Manageable", "Moderate", "Heavy", "Overwhelming"],
  extracurricular_per_week: ["None", "Light", "Balanced", "Active", "Busy", "Packed"],
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

function normalizeAnswer(value) {
  return String(value || "").trim().toLowerCase();
}

function isAnswered(value) {
  return normalizeAnswer(value).length >= 3;
}

function hasAny(text, words) {
  return words.some((word) => text.includes(word));
}

function readFirstNumber(text) {
  const wordNumbers = {
    zero: 0,
    none: 0,
    no: 0,
    one: 1,
    once: 1,
    two: 2,
    twice: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6,
    seven: 7,
    eight: 8,
    nine: 9,
    ten: 10,
  };
  const digitMatch = text.match(/\b\d+(\.\d+)?\b/);
  if (digitMatch) return Number(digitMatch[0]);

  const wordMatch = Object.keys(wordNumbers).find((word) => new RegExp(`\\b${word}\\b`).test(text));
  return wordMatch ? wordNumbers[wordMatch] : null;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function inferFeatureValue(key, answer) {
  const text = normalizeAnswer(answer);
  const number = readFirstNumber(text);

  if (key === "sleep_quality") {
    if (number !== null && (text.includes("hour") || text.includes("hr"))) {
      if (number >= 8) return 5;
      if (number >= 7) return 4;
      if (number >= 6) return 3;
      if (number >= 5) return 2;
      return 1;
    }
    if (hasAny(text, ["exhausted", "drained", "no sleep", "barely sleep", "insomnia", "always tired"])) return 1;
    if (hasAny(text, ["tired", "sleepy", "not refreshed", "wake up tired", "restless"])) return 2;
    if (hasAny(text, ["sometimes", "okay", "average", "depends", "mixed"])) return 3;
    if (hasAny(text, ["rested", "enough sleep", "good sleep", "fine", "usually refreshed"])) return 4;
    if (hasAny(text, ["great", "fully rested", "well rested", "energized", "refreshed every day"])) return 5;
    return 3;
  }

  if (key === "headaches_per_week") {
    if (hasAny(text, ["never", "almost never", "rarely", "none", "no headache"])) return 0;
    if (hasAny(text, ["daily", "every day", "most days", "constant"])) return 5;
    if (number !== null) return clamp(Math.round(number), 0, 5);
    if (hasAny(text, ["very often", "frequent", "a lot", "many times"])) return 4;
    if (hasAny(text, ["often", "several", "multiple"])) return 3;
    if (hasAny(text, ["sometimes", "few", "couple"])) return 2;
    if (hasAny(text, ["once", "occasionally"])) return 1;
    return 2;
  }

  if (key === "academic_performance") {
    if (hasAny(text, ["failing", "lost", "behind", "poor", "bad grades", "struggling a lot"])) return 1;
    if (hasAny(text, ["worried", "uneasy", "struggling", "hard to keep up", "not confident"])) return 2;
    if (hasAny(text, ["average", "okay", "steady", "middle", "passing", "mixed"])) return 3;
    if (hasAny(text, ["confident", "good", "keeping up", "understand most", "on track"])) return 4;
    if (hasAny(text, ["excellent", "strong", "top", "prepared", "high grades", "doing well"])) return 5;
    return 3;
  }

  if (key === "study_load") {
    if (hasAny(text, ["overwhelming", "too much", "constant", "never finish", "burned out", "no time"])) return 5;
    if (hasAny(text, ["heavy", "hard to switch off", "a lot", "crowded", "pressure"])) return 4;
    if (hasAny(text, ["moderate", "normal", "need a plan", "sometimes heavy", "manageable but busy"])) return 3;
    if (hasAny(text, ["manageable", "under control", "fine", "not too much"])) return 2;
    if (hasAny(text, ["light", "easy", "little homework", "plenty of time"])) return 1;
    return 3;
  }

  if (key === "extracurricular_per_week") {
    if (hasAny(text, ["none", "no club", "no activity", "nothing outside"])) return 0;
    if (number !== null) return clamp(Math.round(number), 0, 5);
    if (hasAny(text, ["packed", "every day", "too many", "no free time"])) return 5;
    if (hasAny(text, ["busy", "crowded", "many activities"])) return 4;
    if (hasAny(text, ["balanced", "few", "some", "club and sport"])) return 2;
    if (hasAny(text, ["one", "once", "light"])) return 1;
    return 2;
  }

  return 3;
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

function blendFeatureValues(textValue, volumeValue) {
  return textValue * 0.6 + volumeValue * 0.4;
}

function buildModelInput(formValues, volumeValues) {
  const buckets = Object.fromEntries(modelFeatureKeys.map((key) => [key, []]));

  questions.forEach((question) => {
    if (!isAnswered(formValues[question.key])) return;

    const textFeature = inferFeatureValue(question.featureKey, formValues[question.key]);
    const volumeFeature = volumeToFeatureValue(question, volumeValues[question.key]);
    buckets[question.featureKey].push(blendFeatureValues(textFeature, volumeFeature));
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

function getStressVolume(formValues, volumeValues) {
  const answeredQuestions = questions.filter((question) => isAnswered(formValues[question.key]));
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

function getInterpretedLabel(question, value) {
  const featureValue = inferFeatureValue(question.featureKey, value);
  const labels = featureLabels[question.featureKey] || [];
  return labels[featureValue - (question.featureKey === "headaches_per_week" || question.featureKey === "extracurricular_per_week" ? 0 : 1)] || "Interpreted";
}

export default function App() {
  const [hasStarted, setHasStarted] = useState(false);
  const [view, setView] = useState("checkin");
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(initialForm);
  const [volumes, setVolumes] = useState(initialVolumes);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState(readHistory);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");

  const interpretedInput = useMemo(() => buildModelInput(form, volumes), [form, volumes]);
  const stressVolume = useMemo(() => getStressVolume(form, volumes), [form, volumes]);
  const answeredCount = questions.filter((question) => isAnswered(form[question.key])).length;
  const isComplete = answeredCount === questions.length;
  const progress = Math.round((answeredCount / questions.length) * 100);
  const currentQuestion = questions[step];
  const currentAnswer = form[currentQuestion.key];
  const currentVolume = volumes[currentQuestion.key];
  const isCurrentAnswered = isAnswered(currentAnswer);

  const readinessScore = useMemo(() => {
    const answeredQuestions = questions.filter((question) => isAnswered(form[question.key]));
    if (answeredQuestions.length === 0) return 0;

    const total = answeredQuestions.reduce((sum, question) => sum + scoreQuestion(question, interpretedInput[question.featureKey]), 0);
    return Math.round(total / answeredQuestions.length);
  }, [form, interpretedInput]);

  const pressurePoints = useMemo(() => {
    return questions
      .filter((question) => isAnswered(form[question.key]))
      .map((question) => ({
        ...question,
        score: scoreQuestion(question, interpretedInput[question.featureKey]),
        interpreted: getInterpretedLabel(question, form[question.key]),
      }))
      .sort((a, b) => a.score - b.score)
      .slice(0, 2);
  }, [form, interpretedInput]);

  function updateField(key, value) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
    setResult(null);
    setApiError("");
  }

  function updateVolume(key, value) {
    setVolumes((current) => ({
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
    setForm(initialForm);
    setVolumes(initialVolumes);
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
    setForm({
      ...initialForm,
      ...item.form,
    });
    setVolumes({
      ...initialVolumes,
      ...(item.volumes || {}),
    });
    setResult(item.result);
    setApiError("");
    setView("review");
  }

  function goToReview() {
    if (isComplete) {
      setView("review");
    }
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
            title={isComplete ? "Review answers" : "Answer all questions first"}
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

              <div className="open-answer">
                <textarea
                  value={currentAnswer}
                  onChange={(event) => updateField(currentQuestion.key, event.target.value)}
                  placeholder={currentQuestion.placeholder}
                  rows={7}
                  aria-label={currentQuestion.question}
                />
                <div className="answer-analysis">
                  <span>Interpreted signal</span>
                  <strong>{isCurrentAnswered ? getInterpretedLabel(currentQuestion, currentAnswer) : "Waiting for your answer"}</strong>
                </div>
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
                  disabled={!isCurrentAnswered}
                  onClick={() => setStep((value) => Math.min(questions.length - 1, value + 1))}
                >
                  Next
                  <ArrowRight size={18} />
                </button>
              ) : (
                <button type="button" className="primary-action" disabled={!isComplete} onClick={goToReview}>
                  Review Answers
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
                  <h2>Answer Review</h2>
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
                    <span>{isAnswered(form[question.key]) ? getInterpretedLabel(question, form[question.key]) : "Not answered"}</span>
                    <p>{isAnswered(form[question.key]) ? form[question.key] : "Go back and write an answer."}</p>
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
                    <div>
                      <span>Stress Volume</span>
                      <strong>{stressVolume}%</strong>
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
                <p>The progress percentage shows how many of the ten open-ended questions have been answered.</p>
              </article>
              <article className="info-card">
                <strong>Stress Volume</strong>
                <p>Each question has a 0 to 100 volume control, so answers can show small, medium, or intense pressure instead of only broad levels.</p>
              </article>
              <article className="info-card">
                <strong>Readiness Score</strong>
                <p>A quick wellness-style score based on interpreted answer signals and volume controls. Higher means the answers look more balanced.</p>
              </article>
              <article className="info-card">
                <strong>Live Profile</strong>
                <p>The profile chip changes from Not started to Stable, Mixed, or Strained as answers are written.</p>
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
                <p>Combines the written answers and volume controls into model-ready signals, then returns the stress prediction.</p>
              </article>
              <article className="info-card">
                <strong>Stress Profile</strong>
                <p>Shows the predicted stress level, confidence percentage, recommendation, and probability bars.</p>
              </article>
              <article className="info-card">
                <strong>Action Plan</strong>
                <p>Lists practical next steps based on the predicted stress level and selected answers.</p>
              </article>
              <article className="info-card">
                <strong>History Tab</strong>
                <p>Saves recent predictions in this browser so a previous result can be opened again.</p>
              </article>
              <article className="info-card">
                <strong>Reset Button</strong>
                <p>Clears the current answers and prediction so a new check-in can start from the first question.</p>
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
