import {
  formatDifficulty,
  formatQuizDuration,
} from "../../utils/quiz";

export default function QuizResults({ attempt, onRestart }) {
  return (
    <section className="panel quiz-results">
      <div className="quiz-results__hero">
        <div
          className={`quiz-score${
            attempt.scorePercentage >= 70 ? " is-strong" : ""
          }`}
          aria-label={`Score ${attempt.scorePercentage} percent`}
        >
          <strong>{attempt.scorePercentage}%</strong>
          <span>Score</span>
        </div>

        <div>
          <span className="panel__eyebrow">Quiz complete</span>
          <h2>{attempt.title}</h2>
          <p className="panel__lede">
            You answered {attempt.correctAnswers} of{" "}
            {attempt.totalQuestions} questions correctly in{" "}
            {formatQuizDuration(attempt.timeTakenSeconds)}.
          </p>
          <div className="quiz-results__meta">
            <span className="tag">{formatDifficulty(attempt.difficulty)}</span>
            <span className="tag">{attempt.topic || "General study"}</span>
            {attempt.subject?.name ? (
              <span className="tag">{attempt.subject.name}</span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="quiz-results__head">
        <div>
          <span className="panel__eyebrow">Answer review</span>
          <h3>See what you got right</h3>
        </div>
        <button
          type="button"
          className="button button--primary"
          onClick={onRestart}
        >
          Create another quiz
        </button>
      </div>

      <ol className="quiz-review-list">
        {attempt.questions.map((question, index) => (
          <li
            key={`${index}-${question.questionText}`}
            className={`quiz-review${
              question.isCorrect ? " is-correct" : " is-incorrect"
            }`}
          >
            <div className="quiz-review__head">
              <span className="quiz-review__status">
                {question.isCorrect ? "Correct" : "Needs review"}
              </span>
              <span className="quiz-review__number">
                Question {index + 1}
              </span>
            </div>

            <h4>{question.questionText}</h4>

            <ul className="quiz-review__options">
              {question.options.map((option) => {
                const isCorrect = option === question.correctAnswer;
                const isSelected = option === question.selectedAnswer;
                const classes = [
                  "quiz-review__option",
                  isCorrect ? "is-correct-answer" : "",
                  isSelected && !isCorrect ? "is-wrong-answer" : "",
                ]
                  .filter(Boolean)
                  .join(" ");

                return (
                  <li key={option} className={classes}>
                    <span>{option}</span>
                    <small>
                      {isCorrect
                        ? "Correct answer"
                        : isSelected
                          ? "Your answer"
                          : ""}
                    </small>
                  </li>
                );
              })}
            </ul>

            <p className="quiz-review__explanation">
              <strong>Why:</strong> {question.explanation}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}
