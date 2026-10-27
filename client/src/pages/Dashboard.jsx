import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import StatCard from "../components/StatCard";
import { useAuth } from "../context/AuthContext";
import { getAnalyticsOverview } from "../services/api";
import {
  describeActivity,
  formatAnalyticsDateTime,
  normalizeAnalytics,
} from "../utils/analytics";
import {
  formatMinutes,
  formatStudyDate,
  getApiErrorMessage,
} from "../utils/planner";

const iconProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "1.7",
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": "true",
};

const quickLinks = [
  { to: "/planner", label: "Open study planner", note: "Plan your week" },
  { to: "/quiz", label: "Practice with a quiz", note: "Test recall" },
  { to: "/revision", label: "Review revision queue", note: "Keep it fresh" },
  { to: "/analytics", label: "View analytics", note: "Spot patterns" },
];

function ProgressRow({ label, value, detail }) {
  return (
    <div className="progress-row">
      <div className="progress-row__head">
        <span>{label}</span>
        <strong>{value}%</strong>
      </div>
      <div
        className="progress progress--compact"
        role="progressbar"
        aria-valuemin="0"
        aria-valuemax="100"
        aria-valuenow={value}
        aria-label={`${label}: ${value}%`}
      >
        <span className="progress__bar" style={{ width: `${value}%` }} />
      </div>
      <p>{detail}</p>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState(normalizeAnalytics());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadDashboard() {
    setError("");
    setIsLoading(true);

    try {
      const response = await getAnalyticsOverview();

      setAnalytics(normalizeAnalytics(response.data));
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          "Could not load your dashboard data. Please try again."
        )
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  const { studyPlans, quizzes, revisions, overall, recentActivity } =
    analytics;
  const firstName =
    user?.name?.trim().split(/\s+/).filter(Boolean)[0] || "there";
  const nextPlan = studyPlans.upcoming?.[0] || null;
  const priorityItems = [
    ...(revisions.reminders?.overdue || []).map((item) => ({
      ...item,
      tone: "overdue",
      label: "Overdue review",
    })),
    ...(revisions.reminders?.dueToday || []).map((item) => ({
      ...item,
      tone: "today",
      label: "Due today",
    })),
  ].slice(0, 4);
  const visibleActivity = recentActivity.slice(0, 6);

  return (
    <section className="page">
      <PageHeader
        eyebrow="Overview"
        title={`Welcome back, ${firstName}`}
        description="Your study plans, quiz performance, revision queue, and recent activity in one live snapshot."
        actions={
          <span className="status-pill">
            {isLoading
              ? "Loading live data"
              : error
                ? "Data unavailable"
                : "Live dashboard data"}
          </span>
        }
      />

      <div className="stats-grid">
        <StatCard
          label="Study plans"
          value={isLoading || error ? "—" : studyPlans.total}
          hint={`${studyPlans.active} active · ${studyPlans.paused} paused`}
          tone="blue"
          icon={
            <svg {...iconProps}>
              <rect x="3.5" y="5" width="17" height="15.5" rx="2.4" />
              <path d="M7.5 3v4M16.5 3v4M3.5 10h17" />
            </svg>
          }
        />
        <StatCard
          label="Quiz average"
          value={
            isLoading || error ? "—" : `${quizzes.averageScore}%`
          }
          hint={`${quizzes.totalAttempts} attempt${quizzes.totalAttempts === 1 ? "" : "s"} · ${quizzes.accuracyPercentage}% accuracy`}
          tone="cyan"
          icon={
            <svg {...iconProps}>
              <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
            </svg>
          }
        />
        <StatCard
          label="Due today"
          value={isLoading || error ? "—" : revisions.dueToday}
          hint={`${revisions.overdue} overdue · ${revisions.upcoming} upcoming`}
          tone="violet"
          icon={
            <svg {...iconProps}>
              <circle cx="12" cy="12" r="8.5" />
              <path d="M12 7.5V12l3 2" />
            </svg>
          }
        />
        <StatCard
          label="Study completion"
          value={
            isLoading || error
              ? "—"
              : `${studyPlans.completionPercentage}%`
          }
          hint={`${studyPlans.completedTopics} of ${studyPlans.totalTopics} topics complete.`}
          tone="indigo"
          icon={
            <svg {...iconProps}>
              <path d="m5 12.5 4.2 4.2L19 6.8" />
            </svg>
          }
        />
      </div>

      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel__head">
            <div>
              <span className="panel__eyebrow">Today</span>
              <h2>
                {error ? "Dashboard data unavailable" : "Your priorities"}
              </h2>
            </div>
            <span className="tag">
              {priorityItems.length + (nextPlan ? 1 : 0)} item
              {priorityItems.length + (nextPlan ? 1 : 0) === 1 ? "" : "s"}
            </span>
          </div>

          {error ? (
            <>
              <p className="panel__lede">{error}</p>
              <button type="button" className="button" onClick={loadDashboard}>
                Try again
              </button>
            </>
          ) : isLoading ? (
            <p className="panel__lede">
              Pulling your latest plans, quiz scores, and revision reminders.
            </p>
          ) : (
            <>
              {priorityItems.length > 0 ? (
                <ul className="priority-list">
                  {priorityItems.map((item) => (
                    <li key={`${item.tone}-${item.id}`}>
                      <span
                        className={`priority-dot priority-dot--${item.tone}`}
                        aria-hidden="true"
                      />
                      <div>
                        <strong>{item.topic}</strong>
                        <small>
                          {item.label} · {item.priority} priority
                        </small>
                      </div>
                      <Link to="/revision">Review</Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="panel__lede">
                  No revision items are due today. You can get ahead by opening
                  the revision queue.
                </p>
              )}

              {nextPlan ? (
                <div className="next-exam">
                  <div>
                    <span className="panel__eyebrow">Next exam</span>
                    <h3>{nextPlan.title}</h3>
                    <p>
                      {formatStudyDate(nextPlan.examDate)} ·{" "}
                      {nextPlan.completedTopics}/{nextPlan.totalTopics} topics
                      complete
                    </p>
                  </div>
                  <strong>{nextPlan.completionPercentage}%</strong>
                </div>
              ) : (
                <div className="next-exam next-exam--empty">
                  <div>
                    <span className="panel__eyebrow">Next exam</span>
                    <h3>No upcoming exams</h3>
                    <p>
                      Add an exam date to a study plan and it will appear here
                      with a live completion snapshot.
                    </p>
                  </div>
                  <Link className="button button--small" to="/planner">
                    Open planner
                  </Link>
                </div>
              )}
            </>
          )}
        </section>

        <section className="panel">
          <div className="panel__head">
            <div>
              <span className="panel__eyebrow">Progress</span>
              <h2>Performance snapshot</h2>
            </div>
          </div>

          <div className="progress-stack">
            <ProgressRow
              label="Study plan completion"
              value={
                isLoading || error
                  ? 0
                  : overall.studyCompletionPercentage
              }
              detail={`${formatMinutes(studyPlans.remainingMinutes)} of study left`}
            />
            <ProgressRow
              label="Quiz average"
              value={isLoading || error ? 0 : overall.quizAverageScore}
              detail={`${quizzes.correctAnswers}/${quizzes.totalQuestions} correct answers`}
            />
            <ProgressRow
              label="Revision mastery"
              value={
                isLoading || error
                  ? 0
                  : overall.revisionCompletionPercentage
              }
              detail={`${revisions.completed} of ${revisions.total} revision items completed`}
            />
          </div>

          <p className="dashboard-record-note">
            {isLoading || error
              ? "Metrics appear when your data is available."
              : `${overall.trackedRecords} tracked record${overall.trackedRecords === 1 ? "" : "s"} across plans, quizzes, and revisions.`}
          </p>
        </section>
      </div>

      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel__head">
            <div>
              <span className="panel__eyebrow">Live activity</span>
              <h2>Recent activity</h2>
            </div>
            <Link className="text-link" to="/analytics">
              View analytics
            </Link>
          </div>

          {isLoading ? (
            <p className="panel__lede">Loading your latest activity.</p>
          ) : error ? (
            <p className="panel__lede">
              Recent activity will return when the dashboard reconnects.
            </p>
          ) : visibleActivity.length > 0 ? (
            <ul className="activity-list">
              {visibleActivity.map((event) => (
                <li key={`${event.type}-${event.id}-${event.action}`}>
                  <span
                    className={`activity-icon activity-icon--${event.type}`}
                    aria-hidden="true"
                  />
                  <div>
                    <strong>{event.title}</strong>
                    <small>{describeActivity(event)}</small>
                  </div>
                  <time dateTime={event.timestamp}>
                    {formatAnalyticsDateTime(event.timestamp)}
                  </time>
                </li>
              ))}
            </ul>
          ) : (
            <p className="panel__lede">
              Your plan updates, quiz attempts, and revision reviews will
              appear here as you study.
            </p>
          )}
        </section>

        <section className="panel">
          <div className="panel__head">
            <div>
              <span className="panel__eyebrow">Shortcuts</span>
              <h2>Jump back in</h2>
            </div>
          </div>

          <div className="quick-links">
            {quickLinks.map((link) => (
              <Link className="quick-link" key={link.to} to={link.to}>
                <span>
                  <strong>{link.label}</strong>
                  <small>{link.note}</small>
                </span>
                <span aria-hidden="true">→</span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}
