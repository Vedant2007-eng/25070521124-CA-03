import { useState } from "react";

const difficulties = [
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
];

export default function QuizGeneratorPanel({
  subjects,
  subjectsLoading,
  subjectsError,
  isGenerating,
  error,
  onGenerate,
}) {
  const [subjectId, setSubjectId] = useState("");
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState("medium");
  const [numberOfQuestions, setNumberOfQuestions] = useState("5");
  const [additionalInstructions, setAdditionalInstructions] = useState("");
  const [formError, setFormError] = useState("");

  function handleSubmit(event) {
    event.preventDefault();
    const cleanTopic = topic.trim();
    const questionCount = Number(numberOfQuestions);

    if (!cleanTopic) {
      setFormError("Enter a topic for the quiz.");
      return;
    }

    if (
      !Number.isInteger(questionCount) ||
      questionCount < 1 ||
      questionCount > 20
    ) {
      setFormError("Choose between 1 and 20 questions.");
      return;
    }

    setFormError("");
    onGenerate({
      subjectId: subjectId || null,
      topic: cleanTopic,
      difficulty,
      numberOfQuestions: questionCount,
      questionType: "mcq",
      additionalInstructions: additionalInstructions.trim(),
    });
  }

  return (
    <section className="panel quiz-generator">
      <div className="panel__head">
        <div>
          <span className="panel__eyebrow">Practice builder</span>
          <h2>Generate a new quiz</h2>
        </div>
        <span className="tag">Live AI</span>
      </div>

      <p className="panel__lede">
        Pick a focused topic. The answer key stays on the server until you
        submit your responses.
      </p>

      <form onSubmit={handleSubmit}>
        <div className="quiz-form-grid">
          <label className="field">
            <span>Subject (optional)</span>
            <select
              value={subjectId}
              onChange={(event) => setSubjectId(event.target.value)}
              disabled={isGenerating || subjectsLoading}
            >
              <option value="">General study</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
            {subjectsError ? (
              <small className="field-hint field-hint--error">
                {subjectsError}
              </small>
            ) : null}
          </label>

          <label className="field quiz-form-grid__topic">
            <span>Topic</span>
            <input
              type="text"
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              placeholder="e.g. Quadratic equations"
              maxLength={200}
              required
              disabled={isGenerating}
            />
          </label>

          <label className="field">
            <span>Difficulty</span>
            <select
              value={difficulty}
              onChange={(event) => setDifficulty(event.target.value)}
              disabled={isGenerating}
            >
              {difficulties.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Number of questions</span>
            <select
              value={numberOfQuestions}
              onChange={(event) =>
                setNumberOfQuestions(event.target.value)
              }
              disabled={isGenerating}
            >
              {[3, 5, 8, 10, 15, 20].map((count) => (
                <option key={count} value={count}>
                  {count} questions
                </option>
              ))}
            </select>
          </label>

          <label className="field field--wide">
            <span>Extra focus (optional)</span>
            <textarea
              value={additionalInstructions}
              onChange={(event) =>
                setAdditionalInstructions(event.target.value)
              }
              placeholder="Add a chapter focus, question style, or skill to emphasize."
              rows={3}
              maxLength={800}
              disabled={isGenerating}
            />
            <small className="field-hint">
              {additionalInstructions.length}/800 characters
            </small>
          </label>
        </div>

        {formError || error ? (
          <p className="form-error" role="alert">
            {formError || error}
          </p>
        ) : null}

        <div className="quiz-generator__actions">
          <button
            type="submit"
            className="button button--primary"
            disabled={isGenerating}
          >
            {isGenerating ? "Generating your quiz..." : "Generate quiz with AI"}
          </button>
          <p className="form-note">
            Generation usually takes a few seconds and creates one active
            session.
          </p>
        </div>
      </form>
    </section>
  );
}
