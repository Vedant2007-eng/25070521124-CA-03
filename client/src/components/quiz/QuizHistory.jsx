import {
  formatDifficulty,
  formatQuizDate,
} from "../../utils/quiz";

export default function QuizHistory({
  attempts,
  pagination,
  isLoading,
  error,
  onPageChange,
  onRetry,
}) {
  const total = pagination?.total ?? attempts.length;
  const totalPages = pagination?.totalPages ?? 0;
  const page = pagination?.page ?? 1;

  return (
    <section className="panel quiz-history">
      <div className="panel__head">
        <div>
          <span className="panel__eyebrow">Your results</span>
          <h2>Quiz history</h2>
        </div>
        <span className="tag">{total} attempts</span>
      </div>

      {error ? (
        <div className="quiz-history__state" role="alert">
          <p>{error}</p>
          <button
            type="button"
            className="button button--secondary button--small"
            onClick={onRetry}
          >
            Try again
          </button>
        </div>
      ) : isLoading && attempts.length === 0 ? (
        <p className="quiz-history__state">Loading quiz history...</p>
      ) : attempts.length === 0 ? (
        <p className="quiz-history__state">
          No quiz attempts yet. Submit a generated quiz and your score will
          appear here.
        </p>
      ) : (
        <ul className="quiz-history__list">
          {attempts.map((attempt) => (
            <li className="quiz-history__item" key={attempt.id}>
              <div>
                <span className="quiz-history__date">
                  {formatQuizDate(attempt.completedAt)}
                </span>
                <h3>{attempt.title}</h3>
                <small>
                  {attempt.topic || "General study"} ·{" "}
                  {formatDifficulty(attempt.difficulty)} ·{" "}
                  {attempt.correctAnswers}/{attempt.totalQuestions} correct
                </small>
              </div>
              <strong className="quiz-history__score">
                {attempt.scorePercentage}%
              </strong>
            </li>
          ))}
        </ul>
      )}

      {!error && totalPages > 1 ? (
        <div className="quiz-history__pagination">
          <button
            type="button"
            className="button button--ghost button--small"
            onClick={() => onPageChange(page - 1)}
            disabled={isLoading || page <= 1}
          >
            Previous
          </button>
          <span>
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            className="button button--ghost button--small"
            onClick={() => onPageChange(page + 1)}
            disabled={isLoading || page >= totalPages}
          >
            Next
          </button>
        </div>
      ) : null}
    </section>
  );
}
