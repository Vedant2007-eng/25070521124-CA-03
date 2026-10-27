import { useRef, useState } from "react";
import {
  computePlanProgress,
  formatMinutes,
  formatStudyDate,
  getApiErrorMessage,
  getTopicTitle,
} from "../../utils/planner";

const STATUS_LABELS = {
  active: "Active",
  paused: "Paused",
  completed: "Completed",
};

export default function PlanCard({
  plan,
  onEdit,
  onDelete,
  onGenerate,
  onToggleTopic,
}) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [updatingTopicId, setUpdatingTopicId] = useState(null);
  const generateLock = useRef(false);
  const deleteLock = useRef(false);
  const pendingTopics = useRef(new Set());
  const progress = computePlanProgress(plan);
  const schedule = Array.isArray(plan.schedule) ? plan.schedule : [];
  const canGenerate = plan.examDate && plan.topics.length > 0;

  async function generateSchedule() {
    if (generateLock.current) {
      return;
    }

    generateLock.current = true;
    setError("");
    setIsGenerating(true);

    try {
      await onGenerate(plan.id);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      generateLock.current = false;
      setIsGenerating(false);
    }
  }

  async function toggleTopic(topic, completed) {
    if (pendingTopics.current.has(topic.id)) {
      return;
    }

    pendingTopics.current.add(topic.id);
    setError("");
    setUpdatingTopicId(topic.id);

    try {
      await onToggleTopic(plan.id, topic.id, completed);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      pendingTopics.current.delete(topic.id);
      setUpdatingTopicId(null);
    }
  }

  async function deletePlan() {
    if (deleteLock.current) {
      return;
    }

    deleteLock.current = true;
    setError("");
    setIsGenerating(true);

    try {
      await onDelete(plan.id);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
      deleteLock.current = false;
      setIsGenerating(false);
    }
  }

  return (
    <article className="plan-card">
      <div className="plan-card__head">
        <div>
          <div className="plan-card__badges">
            <span className={`status-pill status-pill--${plan.status}`}>
              {STATUS_LABELS[plan.status] || plan.status}
            </span>
            {plan.subject ? (
              <span className="subject-pill">
                <span
                  className="subject-swatch"
                  style={{
                    backgroundColor: plan.subject.color || "#6ea8fe",
                  }}
                  aria-hidden="true"
                />
                {plan.subject.name}
              </span>
            ) : null}
          </div>
          <h3>{plan.title}</h3>
          {plan.description ? <p>{plan.description}</p> : null}
        </div>
        <div className="plan-card__progress-value">
          <strong>{progress.completionPercentage}%</strong>
          <span>complete</span>
        </div>
      </div>

      <div className="plan-card__meta">
        <span>{formatStudyDate(plan.examDate)}</span>
        <span>{Number(plan.dailyStudyHours)} h/day</span>
        <span>
          {progress.completedTopics}/{progress.totalTopics} topics complete
        </span>
        <span>{schedule.length} scheduled days</span>
      </div>

      <div
        className="progress"
        role="progressbar"
        aria-valuemin="0"
        aria-valuemax="100"
        aria-valuenow={progress.completionPercentage}
        aria-label={`${plan.title} completion`}
      >
        <span
          className="progress__bar"
          style={{ width: `${progress.completionPercentage}%` }}
        />
      </div>

      <div className="plan-card__body">
        <div>
          <h4>Topics</h4>
          {plan.topics.length === 0 ? (
            <p className="empty-inline">No topics yet.</p>
          ) : (
            <ul className="topic-list">
              {plan.topics.map((topic) => (
                <li className="topic-row" key={topic.id}>
                  <label>
                    <input
                      type="checkbox"
                      checked={topic.completed}
                      onChange={(event) =>
                        toggleTopic(topic, event.target.checked)
                      }
                      disabled={updatingTopicId === topic.id || isGenerating}
                    />
                    <span>{topic.title}</span>
                  </label>
                  <small>{formatMinutes(topic.estimatedMinutes)}</small>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h4>Schedule</h4>
          {schedule.length === 0 ? (
            <p className="empty-inline">
              Generate a schedule to split these topics across study days.
            </p>
          ) : (
            <ol className="plan-schedule">
              {schedule.map((day) => (
                <li key={new Date(day.date).toISOString().slice(0, 10)}>
                  <div className="plan-schedule__day">
                    <strong>{formatStudyDate(day.date)}</strong>
                    <span>{formatMinutes(day.totalMinutes)}</span>
                  </div>
                  {day.topics.map((entry) => (
                    <p key={`${day.date}-${entry.topicId}`}>
                      {getTopicTitle(plan, entry.topicId)} ·{" "}
                      {formatMinutes(entry.minutes)}
                    </p>
                  ))}
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>

      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="plan-card__actions">
        <button
          type="button"
          className="button button--ghost button--small"
          onClick={() => onEdit(plan)}
          disabled={isGenerating}
        >
          Edit
        </button>
        <button
          type="button"
          className="button button--ghost button--small"
          onClick={generateSchedule}
          disabled={isGenerating || !canGenerate}
          title={
            canGenerate
              ? "Build a study schedule from these topics"
              : "Add an exam date and topics first"
          }
        >
          {isGenerating
            ? "Generating..."
            : schedule.length > 0
              ? "Regenerate schedule"
              : "Generate schedule"}
        </button>
        {confirmingDelete ? (
          <>
            <button
              type="button"
              className="button button--danger button--small"
              onClick={deletePlan}
              disabled={isGenerating}
            >
              Confirm delete
            </button>
            <button
              type="button"
              className="button button--ghost button--small"
              onClick={() => setConfirmingDelete(false)}
              disabled={isGenerating}
            >
              Cancel
            </button>
          </>
        ) : (
          <button
            type="button"
            className="text-button text-button--danger"
            onClick={() => {
              setConfirmingDelete(true);
              setError("");
            }}
            disabled={isGenerating}
          >
            Delete
          </button>
        )}
      </div>
    </article>
  );
}
