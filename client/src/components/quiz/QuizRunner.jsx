import { useState } from "react";

const optionLetters = ["A", "B", "C", "D"];

export default function QuizRunner({
  quiz,
  isSubmitting,
  submissionError,
  onSubmit,
  onExit,
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [isConfirming, setIsConfirming] = useState(false);
  const question = quiz.questions[currentIndex];
  const answeredCount = quiz.questions.filter(
    (_item, index) => Boolean(answers[index])
  ).length;
  const allAnswered = answeredCount === quiz.questions.length;

  function selectAnswer(answer) {
    setAnswers((current) => ({
      ...current,
      [currentIndex]: answer,
    }));
    setIsConfirming(false);
  }

  function goToQuestion(index) {
    setCurrentIndex(index);
    setIsConfirming(false);
  }

  function confirmSubmission() {
    onSubmit(
      quiz.questions.map((_item, index) => ({
        questionIndex: index,
        selectedAnswer: answers[index],
      }))
    );
  }

  return (
    <section className="panel quiz-runner">
      <div className="quiz-runner__head">
        <div>
          <span className="panel__eyebrow">
            {quiz.subject?.name || "General study"}
          </span>
          <h2>{quiz.topic}</h2>
          <div className="quiz-runner__meta">
            <span className="tag">{quiz.difficulty}</span>
            <span className="tag">{quiz.questionCount} questions</span>
            <span className="tag">
              {answeredCount}/{quiz.questionCount} answered
            </span>
          </div>
        </div>
        <button
          type="button"
          className="button button--ghost button--small"
          onClick={onExit}
          disabled={isSubmitting}
        >
          Start over
        </button>
      </div>

      <div
        className="progress quiz-runner__progress"
        role="progressbar"
        aria-valuemin="0"
        aria-valuemax={quiz.questionCount}
        aria-valuenow={answeredCount}
        aria-label="Quiz progress"
      >
        <span
          className="progress__bar"
          style={{
            width: `${(answeredCount / quiz.questionCount) * 100}%`,
          }}
        />
      </div>

      <div className="quiz-dots" aria-label="Quiz questions">
        {quiz.questions.map((item, index) => (
          <button
            key={item.number}
            type="button"
            className={[
              "quiz-dot",
              index === currentIndex ? "is-current" : "",
              answers[index] ? "is-answered" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={() => goToQuestion(index)}
            aria-label={`Go to question ${item.number}`}
            aria-current={index === currentIndex ? "step" : undefined}
          >
            {item.number}
          </button>
        ))}
      </div>

      <article className="quiz-question" aria-live="polite">
        <span className="quiz-question__count">
          Question {currentIndex + 1} of {quiz.questionCount}
        </span>
        <h3>{question.questionText}</h3>

        <fieldset className="quiz-options">
          <legend>Choose one answer</legend>
          {question.options.map((option, optionIndex) => {
            const isSelected = answers[currentIndex] === option;

            return (
              <label
                key={`${question.number}-${option}`}
                className={`quiz-option${isSelected ? " is-selected" : ""}`}
              >
                <input
                  className="quiz-option__input"
                  type="radio"
                  name={`quiz-question-${currentIndex}`}
                  value={option}
                  checked={isSelected}
                  onChange={() => selectAnswer(option)}
                  disabled={isSubmitting}
                />
                <span className="quiz-option__letter" aria-hidden="true">
                  {optionLetters[optionIndex]}
                </span>
                <span>{option}</span>
              </label>
            );
          })}
        </fieldset>
      </article>

      {submissionError ? (
        <p className="form-error" role="alert">
          {submissionError}
        </p>
      ) : null}

      {isConfirming ? (
        <div className="quiz-confirm" role="region" aria-label="Submit quiz">
          <div>
            <strong>Submit this quiz?</strong>
            <p>
              You answered {answeredCount} of {quiz.questionCount} questions.
              Answers cannot be changed after submission.
            </p>
          </div>
          <div className="quiz-confirm__actions">
            <button
              type="button"
              className="button button--ghost"
              onClick={() => setIsConfirming(false)}
              disabled={isSubmitting}
            >
              Keep reviewing
            </button>
            <button
              type="button"
              className="button button--primary"
              onClick={confirmSubmission}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Submitting..." : "Submit final answers"}
            </button>
          </div>
        </div>
      ) : (
        <>
          {!allAnswered ? (
            <p className="form-note quiz-runner__hint">
              Answer every question before submitting.
            </p>
          ) : null}

          <div className="quiz-runner__actions">
            <button
              type="button"
              className="button button--secondary"
              onClick={() => goToQuestion(currentIndex - 1)}
              disabled={currentIndex === 0 || isSubmitting}
            >
              Previous
            </button>

            {currentIndex < quiz.questions.length - 1 ? (
              <button
                type="button"
                className="button button--primary"
                onClick={() => goToQuestion(currentIndex + 1)}
                disabled={isSubmitting}
              >
                Next question
              </button>
            ) : (
              <button
                type="button"
                className="button button--primary"
                onClick={() => setIsConfirming(true)}
                disabled={!allAnswered || isSubmitting}
              >
                Review and submit
              </button>
            )}
          </div>
        </>
      )}
    </section>
  );
}
