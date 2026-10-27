import { useEffect, useState } from "react";
import PageHeader from "../components/PageHeader";
import PlanCard from "../components/planner/PlanCard";
import PlanEditor from "../components/planner/PlanEditor";
import SubjectManager from "../components/planner/SubjectManager";
import {
  createStudyPlan,
  createSubject,
  deleteStudyPlan,
  deleteSubject,
  generateStudyPlan,
  generateStudyPlanSchedule,
  getStudyPlans,
  getSubjects,
  updateStudyPlan,
  updateStudyPlanTopic,
  updateSubject,
} from "../services/api";
import {
  getApiErrorMessage,
  sortPlans,
} from "../utils/planner";

function upsertPlan(plans, updatedPlan) {
  const exists = plans.some((plan) => plan.id === updatedPlan.id);

  return sortPlans(
    exists
      ? plans.map((plan) =>
          plan.id === updatedPlan.id ? updatedPlan : plan
        )
      : [updatedPlan, ...plans]
  );
}

export default function StudyPlanner() {
  const [subjects, setSubjects] = useState([]);
  const [plans, setPlans] = useState([]);
  const [editor, setEditor] = useState(null);
  const [notice, setNotice] = useState("");
  const [loadError, setLoadError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  async function loadPlanner() {
    setLoadError("");
    setIsLoading(true);

    try {
      const [subjectResponse, planResponse] = await Promise.all([
        getSubjects(),
        getStudyPlans(),
      ]);

      setSubjects(subjectResponse.data.subjects || []);
      setPlans(sortPlans(planResponse.data.plans || []));
    } catch (error) {
      setLoadError(
        getApiErrorMessage(
          error,
          "Could not load your planner. Please try again."
        )
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadPlanner();
  }, []);

  function openCreate() {
    setNotice("");
    setEditor({ key: `new-${Date.now()}`, plan: null });
  }

  function openEdit(plan) {
    setNotice("");
    setEditor({ key: plan.id, plan });
  }

  async function savePlan(payload, { generate = false } = {}) {
    let savedPlan;

    if (editor?.plan) {
      const response = await updateStudyPlan(editor.plan.id, payload);
      savedPlan = response.data.plan;
      setNotice(
        "Study plan updated. Generate a schedule from its card when you are ready."
      );
    } else if (generate) {
      const response = await generateStudyPlan(payload);
      savedPlan = response.data.plan;
      setNotice(
        response.data.duplicate
          ? "A matching generated plan already existed."
          : "Study plan and schedule generated."
      );
    } else {
      const response = await createStudyPlan(payload);
      savedPlan = response.data.plan;
      setNotice(
        "Study plan saved. Generate a schedule from its card when you are ready."
      );
    }

    setPlans((current) => upsertPlan(current, savedPlan));
    setEditor(null);
  }

  async function generateSchedule(planId) {
    const response = await generateStudyPlanSchedule(planId);
    setPlans((current) => upsertPlan(current, response.data.plan));
    setNotice("Study schedule generated.");
  }

  async function toggleTopic(planId, topicId, completed) {
    const response = await updateStudyPlanTopic(
      planId,
      topicId,
      completed
    );

    setPlans((current) => upsertPlan(current, response.data.plan));
  }

  async function removePlan(planId) {
    await deleteStudyPlan(planId);
    setPlans((current) =>
      current.filter((plan) => plan.id !== planId)
    );
    setNotice("Study plan deleted.");
  }

  async function addSubject(values) {
    const response = await createSubject(values);
    setSubjects((current) => [response.data.subject, ...current]);
    setNotice("Subject created.");
  }

  async function editSubject(subjectId, values) {
    const response = await updateSubject(subjectId, values);
    const updatedSubject = response.data.subject;

    setSubjects((current) =>
      current.map((subject) =>
        subject.id === subjectId ? updatedSubject : subject
      )
    );
    setPlans((current) =>
      current.map((plan) =>
        plan.subject?.id === subjectId
          ? {
              ...plan,
              subject: {
                ...plan.subject,
                name: updatedSubject.name,
                color: updatedSubject.color,
              },
            }
          : plan
      )
    );
    setNotice("Subject updated.");
  }

  async function removeSubject(subjectId) {
    await deleteSubject(subjectId);
    setSubjects((current) =>
      current.filter((subject) => subject.id !== subjectId)
    );
    setNotice("Subject deleted.");
  }

  return (
    <section className="page">
      <PageHeader
        eyebrow="Study planner"
        title="Build a plan that fits your life"
        description="Group subjects, break topics into realistic sessions, and generate a study schedule through exam day."
        actions={
          <button
            type="button"
            className="button"
            onClick={openCreate}
            disabled={isLoading}
          >
            New study plan
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
          <p>Loading your subjects and study plans...</p>
        </div>
      ) : loadError ? (
        <div className="panel error-panel" role="alert">
          <h2>Planner unavailable</h2>
          <p>{loadError}</p>
          <button type="button" className="button" onClick={loadPlanner}>
            Try again
          </button>
        </div>
      ) : (
        <>
          {editor ? (
            <PlanEditor
              key={editor.key}
              plan={editor.plan}
              subjects={subjects}
              onSave={savePlan}
              onCancel={() => setEditor(null)}
            />
          ) : null}

          <div className="planner-layout">
            <div className="planner-main">
              <div className="planner-section-head">
                <div>
                  <h2>Your study plans</h2>
                  <p>
                    {plans.length} plan{plans.length === 1 ? "" : "s"} saved
                  </p>
                </div>
              </div>

              {plans.length === 0 ? (
                <div className="panel empty-panel empty-panel--compact">
                  <h2>No study plans yet</h2>
                  <p>
                    Add a subject, list your topics, and let PrepPilot split
                    the work into daily sessions.
                  </p>
                  <button
                    type="button"
                    className="button"
                    onClick={openCreate}
                  >
                    Create your first plan
                  </button>
                </div>
              ) : (
                <div className="plan-list">
                  {plans.map((plan) => (
                    <PlanCard
                      key={plan.id}
                      plan={plan}
                      onEdit={openEdit}
                      onDelete={removePlan}
                      onGenerate={generateSchedule}
                      onToggleTopic={toggleTopic}
                    />
                  ))}
                </div>
              )}
            </div>

            <SubjectManager
              subjects={subjects}
              onCreate={addSubject}
              onUpdate={editSubject}
              onDelete={removeSubject}
            />
          </div>
        </>
      )}
    </section>
  );
}
