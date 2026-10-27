import { useRef, useState } from "react";
import { getApiErrorMessage } from "../../utils/apiError";
import {
  getRevisionPayload,
  REVISION_STATUS_LABELS,
  validateRevisionPayload,
} from "../../utils/revision";

function initialForm(item) {
  return {
    topic: item?.topic || "",
    notes: item?.notes || "",
    priority: item?.priority || "medium",
    status: item?.status || "pending",
    subjectId: item?.subject?.id || "",
  };
}

export default function RevisionEditor({
  item = null,
  subjects = [],
  onSave,
  onCancel,
}) {
  const [form, setForm] = useState(() => initialForm(item));
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const saveLock = useRef(false);
  const isNew = !item;

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event) {
    event.preventDefault();

    if (saveLock.current) {
      return;
    }

    const payload = getRevisionPayload(form);
    const validationMessage = validateRevisionPayload(payload);

    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    saveLock.current = true;
    setError("");
    setIsSaving(true);

    try {
      await onSave(payload);
    } catch (saveError) {
      setError(
        getApiErrorMessage(
          saveError,
          "Could not save the revision item. Please try again."
        )
      );
    } finally {
      saveLock.current = false;
      setIsSaving(false);
    }
  }

  return (
    <section className="editor-panel" aria-labelledby="revision-editor-title">
      <div className="editor-panel__head">
        <div>
          <p className="eyebrow">{isNew ? "New revision item" : "Edit revision"}</p>
          <h2 id="revision-editor-title">
            {isNew ? "Add something to review" : `Update ${item.topic}`}
          </h2>
          <p className="revision-editor__lede">
            New items return after one day, then move to a wider spaced-review
            schedule after each review.
          </p>
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
          <label className="field field--wide">
            <span>Revision topic</span>
            <input
              value={form.topic}
              onChange={(event) => updateField("topic", event.target.value)}
              maxLength={200}
              placeholder="e.g. Photosynthesis light reactions"
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
            <span>Priority</span>
            <select
              value={form.priority}
              onChange={(event) => updateField("priority", event.target.value)}
            >
              <option value="low">Low priority</option>
              <option value="medium">Medium priority</option>
              <option value="high">High priority</option>
            </select>
          </label>

          <label className="field">
            <span>Status</span>
            <select
              value={form.status}
              onChange={(event) => updateField("status", event.target.value)}
            >
              {Object.entries(REVISION_STATUS_LABELS).map(
                ([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                )
              )}
            </select>
          </label>

          <label className="field field--wide">
            <span>Notes</span>
            <textarea
              rows="4"
              maxLength={3000}
              value={form.notes}
              onChange={(event) => updateField("notes", event.target.value)}
              placeholder="Key facts, questions, or prompts to revisit."
            />
          </label>
        </div>

        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}

        <div className="editor-actions">
          <button type="submit" className="button" disabled={isSaving}>
            {isSaving
              ? "Saving..."
              : isNew
                ? "Add revision item"
                : "Save changes"}
          </button>
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
