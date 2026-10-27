import { useRef, useState } from "react";
import { getApiErrorMessage } from "../../utils/planner";

const DEFAULT_COLOR = "#6ea8fe";

function emptyForm() {
  return {
    name: "",
    description: "",
    color: DEFAULT_COLOR,
  };
}

export default function SubjectManager({
  subjects = [],
  onCreate,
  onUpdate,
  onDelete,
}) {
  const [form, setForm] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const mutationLock = useRef(false);

  function openCreate() {
    setEditingId(null);
    setDeletingId(null);
    setError("");
    setForm(emptyForm());
  }

  function openEdit(subject) {
    setEditingId(subject.id);
    setDeletingId(null);
    setError("");
    setForm({
      name: subject.name,
      description: subject.description || "",
      color: subject.color || DEFAULT_COLOR,
    });
  }

  function closeForm() {
    setForm(null);
    setEditingId(null);
    setError("");
  }

  async function submitSubject(event) {
    event.preventDefault();

    if (mutationLock.current) {
      return;
    }

    if (!form?.name.trim()) {
      setError("Enter a subject name.");
      return;
    }

    mutationLock.current = true;
    setError("");
    setIsBusy(true);

    try {
      const values = {
        name: form.name.trim(),
        description: form.description.trim(),
        color: form.color,
      };

      if (editingId) {
        await onUpdate(editingId, values);
      } else {
        await onCreate(values);
      }

      closeForm();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      mutationLock.current = false;
      setIsBusy(false);
    }
  }

  async function confirmDelete(subjectId) {
    if (mutationLock.current) {
      return;
    }

    mutationLock.current = true;
    setError("");
    setIsBusy(true);

    try {
      await onDelete(subjectId);
      setDeletingId(null);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      mutationLock.current = false;
      setIsBusy(false);
    }
  }

  return (
    <aside className="subject-panel" aria-labelledby="subject-panel-title">
      <div className="subject-panel__head">
        <div>
          <p className="eyebrow">Subjects</p>
          <h2 id="subject-panel-title">Organize your plans</h2>
        </div>
        {!form ? (
          <button
            type="button"
            className="button button--ghost button--small"
            onClick={openCreate}
            disabled={isBusy}
          >
            Add subject
          </button>
        ) : null}
      </div>

      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}

      {form ? (
        <form className="subject-form" onSubmit={submitSubject} noValidate>
          <label className="field">
            <span>Subject name</span>
            <input
              value={form.name}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
              maxLength={120}
              placeholder="e.g. Physics"
              required
            />
          </label>
          <label className="field">
            <span>Description</span>
            <textarea
              rows="2"
              maxLength={2000}
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              placeholder="Optional notes"
            />
          </label>
          <label className="subject-color-field">
            <span>Color</span>
            <input
              type="color"
              value={form.color}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  color: event.target.value,
                }))
              }
              aria-label="Subject color"
            />
          </label>
          <div className="subject-form__actions">
            <button type="submit" className="button" disabled={isBusy}>
              {isBusy ? "Saving..." : editingId ? "Update subject" : "Save subject"}
            </button>
            <button
              type="button"
              className="button button--ghost"
              onClick={closeForm}
              disabled={isBusy}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      {subjects.length === 0 ? (
        <p className="empty-inline">
          Add subjects to group related study plans.
        </p>
      ) : (
        <ul className="subject-list">
          {subjects.map((subject) => (
            <li className="subject-item" key={subject.id}>
              <span
                className="subject-swatch"
                style={{ backgroundColor: subject.color || DEFAULT_COLOR }}
                aria-hidden="true"
              />
              <div className="subject-item__body">
                <strong>{subject.name}</strong>
                {subject.description ? <p>{subject.description}</p> : null}
              </div>
              {deletingId === subject.id ? (
                <div className="inline-confirm">
                  <button
                    type="button"
                    className="button button--danger button--small"
                    onClick={() => confirmDelete(subject.id)}
                    disabled={isBusy}
                  >
                    Confirm
                  </button>
                  <button
                    type="button"
                    className="button button--ghost button--small"
                    onClick={() => setDeletingId(null)}
                    disabled={isBusy}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="subject-item__actions">
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => openEdit(subject)}
                    disabled={isBusy}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="text-button text-button--danger"
                    onClick={() => {
                      setDeletingId(subject.id);
                      setEditingId(null);
                      setForm(null);
                      setError("");
                    }}
                    disabled={isBusy}
                  >
                    Delete
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
