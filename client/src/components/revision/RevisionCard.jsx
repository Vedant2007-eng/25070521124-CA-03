import { useRef, useState } from "react";
import { getApiErrorMessage } from "../../utils/apiError";
import {
  describeRevisionDue,
  formatRevisionDate,
  REVISION_PRIORITY_LABELS,
  REVISION_STATUS_LABELS,
} from "../../utils/revision";

function dueTone(item) {
  if (item.status === "completed") {
    return "completed";
  }

  if (item.isOverdue) {
    return "overdue";
  }

  if (item.isDueToday) {
    return "today";
  }

  return "upcoming";
}

export default function RevisionCard({
  item,
  onReview,
  onEdit,
  onDelete,
}) {
  const [error, setError] = useState("");
  const [busyAction, setBusyAction] = useState("");
  const [confirmingMastery, setConfirmingMastery] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const actionLock = useRef(false);
  const isCompleted = item.status === "completed";
  const isBusy = Boolean(busyAction);

  async function recordReview(mastered) {
    if (actionLock.current) {
      return;
    }

    actionLock.current = true;
    setError("");
    setBusyAction(mastered ? "mastered" : "review");

    try {
      await onReview(item.id, { mastered });
      setConfirmingMastery(false);
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          "Could not record this review. Please try again."
        )
      );
    } finally {
      actionLock.current = false;
      setBusyAction("");
    }
  }

  async function removeItem() {
    if (actionLock.current) {
      return;
    }

    actionLock.current = true;
    setError("");
    setBusyAction("delete");

    try {
      await onDelete(item.id);
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          "Could not delete this revision item. Please try again."
        )
      );
    } finally {
      actionLock.current = false;
      setBusyAction("");
    }
  }

  return (
    <article className={`revision-card revision-card--${dueTone(item)}`}>
      <div className="revision-card__head">
        <div>
          <div className="revision-card__badges">
            <span
              className={`status-pill status-pill--revision-${item.status}`}
            >
              {REVISION_STATUS_LABELS[item.status] || item.status}
            </span>
            <span className={`priority-pill priority-pill--${item.priority}`}>
              {REVISION_PRIORITY_LABELS[item.priority] || item.priority}
            </span>
            {item.subject ? (
              <span className="subject-pill">
                <span
                  className="subject-swatch"
                  style={{
                    backgroundColor: item.subject.color || "#6ea8fe",
                  }}
                  aria-hidden="true"
                />
                {item.subject.name}
              </span>
            ) : null}
            {item.sourcePlanId ? (
              <span className="tag">From study plan</span>
            ) : null}
          </div>
          <h3>{item.topic}</h3>
          <p className={`revision-card__due revision-card__due--${dueTone(item)}`}>
            {describeRevisionDue(item)}
          </p>
        </div>
        <div className="revision-card__count">
          <strong>{item.reviewCount}</strong>
          <span>review{item.reviewCount === 1 ? "" : "s"}</span>
        </div>
      </div>

      {item.notes ? <p className="revision-card__notes">{item.notes}</p> : null}

      <div className="revision-card__meta">
        <span>Next: {formatRevisionDate(item.nextReviewAt)}</span>
        <span>
          Last reviewed:{" "}
          {item.lastReviewedAt
            ? formatRevisionDate(item.lastReviewedAt)
            : "Not yet"}
        </span>
      </div>

      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="revision-card__actions">
        {!isCompleted ? (
          <>
            <button
              type="button"
              className="button button--small"
              onClick={() => recordReview(false)}
              disabled={isBusy}
            >
              {busyAction === "review" ? "Recording..." : "Review now"}
            </button>
            {confirmingMastery ? (
              <>
                <button
                  type="button"
                  className="button button--success button--small"
                  onClick={() => recordReview(true)}
                  disabled={isBusy}
                >
                  {busyAction === "mastered"
                    ? "Completing..."
                    : "Confirm mastered"}
                </button>
                <button
                  type="button"
                  className="button button--ghost button--small"
                  onClick={() => setConfirmingMastery(false)}
                  disabled={isBusy}
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                type="button"
                className="button button--ghost button--small"
                onClick={() => {
                  setConfirmingMastery(true);
                  setError("");
                }}
                disabled={isBusy}
              >
                Mark mastered
              </button>
            )}
          </>
        ) : (
          <span className="revision-card__mastered">
            Completed on{" "}
            {item.lastReviewedAt
              ? formatRevisionDate(item.lastReviewedAt)
              : "record"}
          </span>
        )}

        <button
          type="button"
          className="button button--ghost button--small"
          onClick={() => onEdit(item)}
          disabled={isBusy}
        >
          Edit
        </button>

        {confirmingDelete ? (
          <>
            <button
              type="button"
              className="button button--danger button--small"
              onClick={removeItem}
              disabled={isBusy}
            >
              {busyAction === "delete" ? "Deleting..." : "Confirm delete"}
            </button>
            <button
              type="button"
              className="button button--ghost button--small"
              onClick={() => setConfirmingDelete(false)}
              disabled={isBusy}
            >
              Cancel
            </button>
          </>
        ) : (
          <button
            type="button"
            className="text-button text-button--danger revision-card__delete"
            onClick={() => {
              setConfirmingDelete(true);
              setError("");
            }}
            disabled={isBusy}
          >
            Delete
          </button>
        )}
      </div>
    </article>
  );
}
