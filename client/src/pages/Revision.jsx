import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import StatCard from "../components/StatCard";
import RevisionCard from "../components/revision/RevisionCard";
import RevisionEditor from "../components/revision/RevisionEditor";
import {
  createRevision,
  deleteRevision,
  generateRevisionsFromStudyPlan,
  getRevisionSummary,
  getRevisions,
  getStudyPlans,
  getSubjects,
  reviewRevision,
  updateRevision,
} from "../services/api";
import { getApiErrorMessage } from "../utils/apiError";
import {
  getRevisionFilterCounts,
  REVISION_FILTERS,
  revisionMatchesFilter,
  sortRevisionItems,
} from "../utils/revision";

const EMPTY_SUMMARY = {
  total: 0,
  pending: 0,
  inProgress: 0,
  active: 0,
  dueToday: 0,
  overdue: 0,
  upcoming: 0,
  completed: 0,
  completionPercentage: 0,
};

const iconProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "1.7",
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": "true",
};

function upsertRevision(items, updatedItem) {
  const exists = items.some((item) => item.id === updatedItem.id);

  return sortRevisionItems(
    exists
      ? items.map((item) =>
          item.id === updatedItem.id ? updatedItem : item
        )
      : [updatedItem, ...items]
  );
}

export default function Revision() {
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [subjects, setSubjects] = useState([]);
  const [plans, setPlans] = useState([]);
  const [editor, setEditor] = useState(null);
  const [filter, setFilter] = useState("all");
  const [importPlanId, setImportPlanId] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const importLock = useRef(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState("");

  async function loadRevisionData() {
    setLoadError("");
    setIsLoading(true);

    try {
      const [revisionResponse, summaryResponse, subjectResponse, planResponse] =
        await Promise.all([
          getRevisions(),
          getRevisionSummary(),
          getSubjects(),
          getStudyPlans(),
        ]);
      const nextPlans = planResponse.data.plans || [];

      setItems(sortRevisionItems(revisionResponse.data.revisions || []));
      setSummary(summaryResponse.data.summary || EMPTY_SUMMARY);
      setSubjects(subjectResponse.data.subjects || []);
      setPlans(nextPlans);
      setImportPlanId((current) => current || nextPlans[0]?.id || "");
    } catch (error) {
      setLoadError(
        getApiErrorMessage(
          error,
          "Could not load your revision queue. Please try again."
        )
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadRevisionData();
  }, []);

  async function refreshSummary() {
    try {
      const response = await getRevisionSummary();
      setSummary(response.data.summary || EMPTY_SUMMARY);
    } catch {
      setSummary((current) => current);
    }
  }

  function openCreate() {
    setNotice("");
    setEditor({ key: `new-${Date.now()}`, item: null });
  }

  function openEdit(item) {
    setNotice("");
    setEditor({ key: item.id, item });
  }

  async function saveItem(payload) {
    const response = editor?.item
      ? await updateRevision(editor.item.id, payload)
      : await createRevision(payload);
    const savedItem = response.data.revision;

    setItems((current) => upsertRevision(current, savedItem));
    setEditor(null);
    setNotice(
      editor?.item ? "Revision item updated." : "Revision item added."
    );
    await refreshSummary();
  }

  async function recordReview(itemId, { mastered }) {
    const response = await reviewRevision(itemId, { mastered });

    setItems((current) => upsertRevision(current, response.data.revision));
    setNotice(
      mastered
        ? "Revision item marked as mastered."
        : "Review recorded. The next review has been scheduled."
    );
    await refreshSummary();
  }

  async function removeItem(itemId) {
    await deleteRevision(itemId);
    setItems((current) => current.filter((item) => item.id !== itemId));
    setNotice("Revision item deleted.");
    await refreshSummary();
  }

  async function importPlan() {
    if (!importPlanId || importLock.current) {
      return;
    }

    importLock.current = true;
    setIsImporting(true);
    setNotice("");
    setLoadError("");

    try {
      const response = await generateRevisionsFromStudyPlan(importPlanId);
      const created = response.data.created ?? 0;
      const skipped = response.data.skipped ?? 0;
      const [revisionResponse, summaryResponse] = await Promise.all([
        getRevisions(),
        getRevisionSummary(),
      ]);

      setItems(sortRevisionItems(revisionResponse.data.revisions || []));
      setSummary(summaryResponse.data.summary || EMPTY_SUMMARY);
      setNotice(
        created > 0
          ? `${created} revision item${created === 1 ? "" : "s"} created${
              skipped > 0
                ? `; ${skipped} existing item${skipped === 1 ? "" : "s"} skipped`
                : ""
            }.`
          : "Every topic in that study plan already has a revision item."
      );
    } catch (error) {
      setLoadError(
        getApiErrorMessage(
          error,
          "Could not generate revision items from that study plan."
        )
      );
    } finally {
      importLock.current = false;
      setIsImporting(false);
    }
  }

  const counts = getRevisionFilterCounts(items);
  const visibleItems = items.filter((item) =>
    revisionMatchesFilter(item, filter)
  );
  const selectedPlan = plans.find((plan) => plan.id === importPlanId);

  return (
    <section className="page">
      <PageHeader
        eyebrow="Revision"
        title="Remember more with spaced reviews"
        description="Bring topics back at the right moment, record each review, and master the material over time."
        actions={
          <button
            type="button"
            className="button"
            onClick={openCreate}
            disabled={isLoading}
          >
            New revision item
          </button>
        }
      />

      {notice ? (
        <p className="planner-notice" role="status">
          {notice}
        </p>
      ) : null}

      {isLoading ? (
        <div className="panel loading-panel" role="status">
          <span className="loading-pulse" aria-hidden="true" />
          <p>Loading your revision queue...</p>
        </div>
      ) : loadError && items.length === 0 ? (
        <div className="panel error-panel" role="alert">
          <h2>Revision queue unavailable</h2>
          <p>{loadError}</p>
          <button type="button" className="button" onClick={loadRevisionData}>
            Try again
          </button>
        </div>
      ) : (
        <>
          <div className="stats-grid revision-stats">
            <StatCard
              label="Due today"
              value={summary.dueToday}
              hint={`${summary.active} active revision items.`}
              tone="blue"
              icon={
                <svg {...iconProps}>
                  <circle cx="12" cy="12" r="8.5" />
                  <path d="M12 7.5V12l3 2" />
                </svg>
              }
            />
            <StatCard
              label="Overdue"
              value={summary.overdue}
              hint="Items waiting for attention."
              tone="violet"
              icon={
                <svg {...iconProps}>
                  <path d="M12 4 3.5 20h17L12 4Z" />
                  <path d="M12 9v4.5M12 17h.01" />
                </svg>
              }
            />
            <StatCard
              label="Upcoming"
              value={summary.upcoming}
              hint="Scheduled after today."
              tone="cyan"
              icon={
                <svg {...iconProps}>
                  <path d="M20 7v5h-5" />
                  <path d="M4 17v-5h5" />
                  <path d="M6.1 9a7 7 0 0 1 11.5-2.2L20 9M4 15l2.4 2.2A7 7 0 0 0 17.9 15" />
                </svg>
              }
            />
            <StatCard
              label="Mastered"
              value={`${summary.completionPercentage}%`}
              hint={`${summary.completed} of ${summary.total} revision items.`}
              tone="indigo"
              icon={
                <svg {...iconProps}>
                  <path d="m5 12.5 4.2 4.2L19 6.8" />
                </svg>
              }
            />
          </div>

          {loadError ? (
            <div className="panel error-panel revision-inline-error" role="alert">
              <p>{loadError}</p>
              <button type="button" className="button" onClick={loadRevisionData}>
                Try again
              </button>
            </div>
          ) : null}

          <section className="panel revision-import" aria-labelledby="revision-import-title">
            <div>
              <span className="panel__eyebrow">Build your queue</span>
              <h2 id="revision-import-title">Import from a study plan</h2>
              <p>
                Turn every topic in one of your saved plans into a revision
                item. Existing imports are skipped safely.
              </p>
            </div>
            {plans.length === 0 ? (
              <div className="revision-import__actions">
                <p className="empty-inline">
                  Create a study plan with topics first.
                </p>
                <Link className="button button--ghost" to="/planner">
                  Open study planner
                </Link>
              </div>
            ) : (
              <div className="revision-import__form">
                <label className="field">
                  <span>Study plan</span>
                  <select
                    value={importPlanId}
                    onChange={(event) => setImportPlanId(event.target.value)}
                  >
                    {plans.map((plan) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.title} ({plan.topics?.length || 0} topics)
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  className="button"
                  onClick={importPlan}
                  disabled={isImporting || !importPlanId}
                >
                  {isImporting ? "Generating..." : "Generate revision items"}
                </button>
              </div>
            )}
          </section>

          {editor ? (
            <RevisionEditor
              key={editor.key}
              item={editor.item}
              subjects={subjects}
              onSave={saveItem}
              onCancel={() => setEditor(null)}
            />
          ) : null}

          <div className="revision-toolbar">
            <div className="revision-filters" aria-label="Filter revisions">
              {REVISION_FILTERS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={`revision-filter${
                    filter === option.id ? " is-active" : ""
                  }`}
                  aria-pressed={filter === option.id}
                  onClick={() => setFilter(option.id)}
                >
                  {option.label}
                  <span>{counts[option.id]}</span>
                </button>
              ))}
            </div>
            <p className="revision-toolbar__count">
              {visibleItems.length} item{visibleItems.length === 1 ? "" : "s"}
              {selectedPlan ? ` · importing from ${selectedPlan.title}` : ""}
            </p>
          </div>

          {visibleItems.length === 0 ? (
            <div className="panel empty-panel empty-panel--compact">
              <h2>
                {items.length === 0
                  ? "Your revision queue is empty"
                  : "No items match this filter"}
              </h2>
              <p>
                {items.length === 0
                  ? "Add a revision item directly or import the topics from a study plan."
                  : "Choose another filter or add a new revision item."}
              </p>
              <button type="button" className="button" onClick={openCreate}>
                Add a revision item
              </button>
            </div>
          ) : (
            <div className="revision-list">
              {visibleItems.map((item) => (
                <RevisionCard
                  key={item.id}
                  item={item}
                  onReview={recordReview}
                  onEdit={openEdit}
                  onDelete={removeItem}
                />
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
