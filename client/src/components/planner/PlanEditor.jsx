import { useMemo, useRef, useState } from "react";
import { formatMinutes, toDateInputValue, todayDateInputValue } from "../../utils/planner";

let topicKeySeed = 0;

function nextTopicKey() {
  topicKeySeed += 1;
  return `topic-${Date.now()}-${topicKeySeed}`;
}

function createEmptyTopic() {
  return {
    key: nextTopicKey(),
    id: null,
    title: "",
    description: "",
    estimatedMinutes: 30,
    completed: false,
  };
}

function initialForm(plan) {
  if (!plan) {
    return {
      title: "",
      description: "",
      subjectId: "",
      examDate: "",
      dailyStudyHours: "2",
      status: "active",
      topics: [createEmptyTopic()],
    };
  }

  return {
    title: plan.title || "",
    description: plan.description || "",
    subjectId: plan.subject?.id || "",
    examDate: toDateInputValue(plan.examDate),
    dailyStudyHours: String(plan.dailyStudyHours ?? 2),
    status: plan.status || "active",
    topics:
      plan.topics?.length > 0
        ? plan.topics.map((topic) => ({
            key: topic.id || nextTopicKey(),
            id: topic.id,
            title: topic.title,
            description: topic.description || "",
            estimatedMinutes: topic.estimatedMinutes || 30,
            completed: Boolean(topic.completed),
          }))
        : [createEmptyTopic()],
  };
}

export default function PlanEditor({
  plan = null,
  subjects = [],
  onSave,
  onCancel,
}) {
  const [form, setForm] = useState(() => initialForm(plan));
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const saveLock = useRef(false);
  const isNew = !plan;

  const totalEstimatedMinutes = useMemo(
    () =>
      form.topics.reduce(
        (total, topic) =>
          total + Math.max(0, Number(topic.estimatedMinutes) || 0),
        0
      ),
    [form.topics]
  );

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function updateTopic(key, field, value) {
    setForm((current) => ({
      ...current,
      topics: current.topics.map((topic) =>
        topic.key === key ? { ...topic, [field]: value } : topic
      ),
    }));
  }

  function addTopic() {
    setForm((current) => ({
      ...current,
      topics: [...current.topics, createEmptyTopic()],
    }));
  }

  function removeTopic(key) {
    setForm((current) => ({
      ...current,
      topics: current.topics.filter((topic) => topic.key !== key),
    }));
  }

  function buildPayload() {
    return {
      title: form.title.trim(),
      description: form.description.trim(),
      subject: form.subjectId || null,
      examDate: form.examDate || null,
      dailyStudyHours: Number(form.dailyStudyHours),
      status: form.status,
      topics: form.topics.map((topic) => ({
        ...(topic.id ? { id: topic.id } : {}),
        title: topic.title.trim(),
        description: topic.description || "",
        estimatedMinutes: Number(topic.estimatedMinutes),
        completed: Boolean(topic.completed),
      })),
    };
  }

  function validatePayload(payload, { requireSchedule = false } = {}) {
    if (!payload.title) {
      return "Enter a plan title.";
    }

    if (
      !Number.isFinite(payload.dailyStudyHours) ||
      payload.dailyStudyHours < 0.5 ||
      payload.dailyStudyHours > 24
    ) {
      return "Daily study hours must be between 0.5 and 24.";
    }

    if (payload.topics.some((topic) => !topic.title)) {
      return "Give every topic a title.";
    }

    if (
      payload.topics.some(
        (topic) =>
          !Number.isInteger(topic.estimatedMinutes) ||
          topic.estimatedMinutes < 1
      )
    ) {
      return "Topic estimates must be whole minutes of at least 1.";
    }

    if (requireSchedule) {
      if (!payload.examDate) {
        return "Choose an exam date before generating a schedule.";
      }

      if (payload.topics.length === 0) {
        return "Add at least one topic before generating a schedule.";
      }
    }

    return "";
  }

  async function submit(event, { generate = false } = {}) {
    event.preventDefault();

    if (saveLock.current) {
      return;
    }

    const payload = buildPayload();
    const validationMessage = validatePayload(payload, {
      requireSchedule: generate,
    });

    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    saveLock.current = true;
    setError("");
    setIsSaving(true);

    try {
      await onSave(payload, { generate });
    } catch (saveError) {
      setError(
        saveError?.response?.data?.message ||
          "Could not save the study plan. Please try again."
      );
    } finally {
      saveLock.current = false;
      setIsSaving(false);
    }
  }

  return (
    <section className="editor-panel" aria-labelledby="plan-editor-title">
      <div className="editor-panel__head">
        <div>
          <p className="eyebrow">{isNew ? "New plan" : "Edit plan"}</p>
          <h2 id="plan-editor-title">
            {isNew ? "Build a study plan" : `Update ${plan.title}`}
          </h2>
        </div>
        <button
          type="button"
          className="button button--ghost"
          onClick={onCancel}
          disabled={isSaving}
        >
          Close
        </button>
      </div>

      <form className="editor-form" onSubmit={submit} noValidate>
        <div className="editor-grid">
          <label className="field">
            <span>Plan title</span>
            <input
              value={form.title}
              onChange={(event) => updateField("title", event.target.value)}
              maxLength={200}
              placeholder="e.g. Physics final revision"
              required
            />
          </label>

          <label className="field">
            <span>Subject</span>
            <select
              value={form.subjectId}
              onChange={(event) => updateField("subjectId", event.target.value)}
            >
              <option value="">No subject</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Exam date</span>
            <input
              type="date"
              value={form.examDate}
              min={todayDateInputValue()}
              onChange={(event) => updateField("examDate", event.target.value)}
            />
          </label>

          <label className="field">
            <span>Daily study hours</span>
            <input
              type="number"
              min="0.5"
              max="24"
              step="0.5"
              value={form.dailyStudyHours}
              onChange={(event) =>
                updateField("dailyStudyHours", event.target.value)
              }
              required
            />
          </label>

          <label className="field">
            <span>Status</span>
            <select
              value={form.status}
              onChange={(event) => updateField("status", event.target.value)}
            >
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="completed">Completed</option>
            </select>
          </label>

          <label className="field field--wide">
            <span>Description</span>
            <textarea
              rows="3"
              maxLength={2000}
              value={form.description}
              onChange={(event) =>
                updateField("description", event.target.value)
              }
              placeholder="What should this plan help you achieve?"
            />
          </label>
        </div>

        <div className="editor-topics">
          <div className="editor-topics__head">
            <div>
              <h3>Topics</h3>
              <p>
                {form.topics.length} topic{form.topics.length === 1 ? "" : "s"} ·{" "}
                {formatMinutes(totalEstimatedMinutes)} estimated
              </p>
            </div>
            <button
              type="button"
              className="button button--ghost"
              onClick={addTopic}
              disabled={isSaving || form.topics.length >= 100}
            >
              Add topic
            </button>
          </div>

          {form.topics.length === 0 ? (
            <p className="empty-inline">
              Add at least one topic to make this plan useful.
            </p>
          ) : (
            <div className="topic-edit-list">
              {form.topics.map((topic, index) => (
                <div className="topic-edit-row" key={topic.key}>
                  <label className="field topic-edit-row__title">
                    <span>Topic {index + 1}</span>
                    <input
                      value={topic.title}
                      onChange={(event) =>
                        updateTopic(topic.key, "title", event.target.value)
                      }
                      maxLength={200}
                      placeholder="Topic name"
                      required
                    />
                  </label>
                  <label className="field topic-edit-row__minutes">
                    <span>Minutes</span>
                    <input
                      type="number"
                      min="1"
                      max="1440"
                      step="1"
                      value={topic.estimatedMinutes}
                      onChange={(event) =>
                        updateTopic(
                          topic.key,
                          "estimatedMinutes",
                          event.target.value
                        )
                      }
                      required
                    />
                  </label>
                  <button
                    type="button"
                    className="button button--danger-ghost topic-edit-row__remove"
                    onClick={() => removeTopic(topic.key)}
                    disabled={isSaving}
                    aria-label={`Remove topic ${index + 1}`}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}

        <div className="editor-actions">
          <button type="submit" className="button" disabled={isSaving}>
            {isSaving ? "Saving..." : isNew ? "Save without schedule" : "Save plan"}
          </button>
          {isNew ? (
            <button
              type="button"
              className="button button--ghost"
              onClick={(event) => submit(event, { generate: true })}
              disabled={
                isSaving || !form.examDate || form.topics.length === 0
              }
            >
              Generate & save
            </button>
          ) : null}
          <button
            type="button"
            className="button button--ghost"
            onClick={onCancel}
            disabled={isSaving}
          >
            Cancel
          </button>
        </div>
      </form>
    </section>
  );
}
