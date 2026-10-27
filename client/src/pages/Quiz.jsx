import { useEffect, useRef, useState } from "react";
import PageHeader from "../components/PageHeader";
import QuizGeneratorPanel from "../components/quiz/QuizGeneratorPanel";
import QuizHistory from "../components/quiz/QuizHistory";
import QuizResults from "../components/quiz/QuizResults";
import QuizRunner from "../components/quiz/QuizRunner";
import {
  generateQuiz,
  getQuizHistory,
  getSubjects,
  submitQuiz,
} from "../services/api";
import { getApiErrorMessage } from "../utils/apiError";

const HISTORY_LIMIT = 5;

export default function Quiz() {
  const [subjects, setSubjects] = useState([]);
  const [subjectsLoading, setSubjectsLoading] = useState(true);
  const [subjectsError, setSubjectsError] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState("");
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [attempt, setAttempt] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState("");
  const generationLock = useRef(false);
  const submissionLock = useRef(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [history, setHistory] = useState({
    attempts: [],
    pagination: null,
    isLoading: true,
    error: "",
  });

  async function loadHistory(page) {
    setHistory((current) => ({
      ...current,
      isLoading: true,
      error: "",
    }));

    try {
      const response = await getQuizHistory({
        page,
        limit: HISTORY_LIMIT,
      });

      setHistory({
        attempts: response.data.attempts || [],
        pagination: response.data.pagination || null,
        isLoading: false,
        error: "",
      });
    } catch (error) {
      setHistory((current) => ({
        ...current,
        isLoading: false,
        error: getApiErrorMessage(
          error,
          "Could not load quiz history. Please try again."
        ),
      }));
    }
  }

  useEffect(() => {
    let isCurrent = true;

    async function loadSubjects() {
      try {
        const response = await getSubjects();

        if (isCurrent) {
          setSubjects(response.data.subjects || []);
        }
      } catch (error) {
        if (isCurrent) {
          setSubjectsError(
            getApiErrorMessage(
              error,
              "Could not load your subjects. You can still use a general topic."
            )
          );
        }
      } finally {
        if (isCurrent) {
          setSubjectsLoading(false);
        }
      }
    }

    loadSubjects();

    return () => {
      isCurrent = false;
    };
  }, []);

  useEffect(() => {
    loadHistory(historyPage);
  }, [historyPage]);

  async function handleGenerate(values) {
    if (generationLock.current) {
      return;
    }

    generationLock.current = true;
    setIsGenerating(true);
    setGenerationError("");
    setSubmissionError("");
    setAttempt(null);

    try {
      const response = await generateQuiz(values);
      setActiveQuiz(response.data.quiz);
    } catch (error) {
      setGenerationError(
        getApiErrorMessage(
          error,
          "Could not generate a quiz. Please try again."
        )
      );
    } finally {
      generationLock.current = false;
      setIsGenerating(false);
    }
  }

  async function handleSubmit(answers) {
    if (submissionLock.current || !activeQuiz) {
      return;
    }

    submissionLock.current = true;
    setIsSubmitting(true);
    setSubmissionError("");

    try {
      const response = await submitQuiz(activeQuiz.id, answers);
      setAttempt(response.data.attempt);
      setActiveQuiz(null);

      if (historyPage === 1) {
        await loadHistory(1);
      } else {
        setHistoryPage(1);
      }
    } catch (error) {
      setSubmissionError(
        getApiErrorMessage(
          error,
          "Could not submit the quiz. Please try again."
        )
      );
    } finally {
      submissionLock.current = false;
      setIsSubmitting(false);
    }
  }

  function handleExitQuiz() {
    setActiveQuiz(null);
    setSubmissionError("");
  }

  function handleRestart() {
    setAttempt(null);
    setActiveQuiz(null);
    setGenerationError("");
    setSubmissionError("");
  }

  const status = isGenerating
    ? "Generating"
    : isSubmitting
      ? "Submitting"
      : attempt
        ? "Quiz complete"
        : activeQuiz
          ? "Quiz in progress"
          : "Ready";

  return (
    <section className="page">
      <PageHeader
        eyebrow="AI quizzes"
        title="Practice with a quiz built for your topic"
        description="Generate a focused multiple-choice quiz, submit your answers, and review server-graded explanations and your quiz history."
        actions={<span className="status-pill">{status}</span>}
      />

      <div className="quiz-layout">
        <div className="quiz-main">
          {attempt ? (
            <QuizResults attempt={attempt} onRestart={handleRestart} />
          ) : activeQuiz ? (
            <QuizRunner
              key={activeQuiz.id}
              quiz={activeQuiz}
              isSubmitting={isSubmitting}
              submissionError={submissionError}
              onSubmit={handleSubmit}
              onExit={handleExitQuiz}
            />
          ) : (
            <QuizGeneratorPanel
              subjects={subjects}
              subjectsLoading={subjectsLoading}
              subjectsError={subjectsError}
              isGenerating={isGenerating}
              error={generationError}
              onGenerate={handleGenerate}
            />
          )}
        </div>

        <aside className="quiz-side">
          <QuizHistory
            attempts={history.attempts}
            pagination={history.pagination}
            isLoading={history.isLoading}
            error={history.error}
            onPageChange={setHistoryPage}
            onRetry={() => loadHistory(historyPage)}
          />
        </aside>
      </div>
    </section>
  );
}
