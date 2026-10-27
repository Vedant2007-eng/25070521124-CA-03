import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import ScoreTrendChart from "../components/analytics/ScoreTrendChart";
import StatCard from "../components/StatCard";
import { getAnalyticsOverview } from "../services/api";
import {
  formatAnalyticsDate,
  normalizeAnalytics,
} from "../utils/analytics";
import { formatMinutes, getApiErrorMessage } from "../utils/planner";

const iconProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "1.7",
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": "true",
};

function getPriorityReminders(revisions, limit = 6) {
  return [
    ...(revisions.reminders?.overdue || []).map((item) => ({
      ...item,
      tone: "overdue",
      label: "Overdue",
    })),
    ...(revisions.reminders?.dueToday || []).map((item) => ({
      ...item,
      tone: "today",
      label: "Due today",
    })),
    ...(revisions.reminders?.upcoming || []).map((item) => ({
      ...item,
      tone: "upcoming",
      label: "Upcoming",
    })),
  ].slice(0, limit);
}

function AnalyticsLoading() {
  return (
    <div className="panel analytics-state">
      <span className="analytics-state__spinner" aria-hidden="true" />
      <h2>Building your analytics</h2>
      <p>Reading your plans, quiz attempts, and revision progress.</p>
    </div>
  );
}

function AnalyticsEmpty() {
  return (
    <div className="panel empty-panel">
      <span className="empty-icon empty-icon--violet" aria-hidden="true">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
        </svg>
      </span>
      <h2>Your analytics start with your first study action</h2>
      <p>
        Create a study plan, complete a quiz, or review a revision item. This
        page will then show only your real progress. No sample scores are used.
      </p>
      <div className="analytics-empty__actions">
        <Link className="button button--primary" to="/planner">
          Create a study plan
        </Link>
        <Link className="button button--secondary" to="/quiz">
          Take a quiz
        </Link>
      </div>
    </div>
  );
}

export default function Analytics() {
  const [analytics, setAnalytics] = useState(normalizeAnalytics());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadAnalytics() {
    setError("");
    setIsLoading(true);

    try {
      const response = await getAnalyticsOverview();
      setAnalytics(normalizeAnalytics(response.data));
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          "Could not load your analytics. Please try again."
        )
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadAnalytics();
  }, []);

  const { studyPlans, quizzes, revisions, overall } = analytics;
  const reminders = getPriorityReminders(revisions);
  const hasData = overall.trackedRecords > 0;
  const subjectById = new Map(
    analytics.subjectPerformance.map((subject) => [subject.id, subject])
  );

  return (
    <section className="page">
      <PageHeader
        eyebrow="Analytics"
        title="Performance analytics"
        description="See completion, quiz accuracy, subject strengths, weaker topics, and the revision work that needs attention next."
        actions={
          <span className="status-pill">
            {isLoading
              ? "Calculating live data"
              : error
                ? "Data unavailable"
                : "Live · UTC"}
          </span>
        }
      />

      {error ? (
        <div className="panel analytics-state" role="alert">
          <h2>Analytics unavailable</h2>
          <p>{error}</p>
          <button type="button" className="button" onClick={loadAnalytics}>
            Try again
          </button>
        </div>
      ) : isLoading ? (
        <AnalyticsLoading />
      ) : !hasData ? (
        <AnalyticsEmpty />
      ) : (
        <>
          <div className="stats-grid">
            <StatCard
              label="Study completion"
              value={`${studyPlans.completionPercentage}%`}
              hint={`${studyPlans.completedTopics}/${studyPlans.totalTopics} topics · ${studyPlans.total} plans`}
              tone="blue"
              icon={
                <svg {...iconProps}>
                  <rect x="3.5" y="5" width="17" height="15.5" rx="2.4" />
                  <path d="M7.5 3v4M16.5 3v4M3.5 10h17" />
                </svg>
              }
            />
            <StatCard
              label="Average quiz score"
              value={`${quizzes.averageScore}%`}
              hint={`${quizzes.totalAttempts} attempts · ${quizzes.accuracyPercentage}% accuracy`}
              tone="cyan"
              icon={
                <svg {...iconProps}>
                  <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
                </svg>
              }
            />
            <StatCard
              label="Revision mastery"
              value={`${revisions.completionPercentage}%`}
              hint={`${revisions.completed}/${revisions.total} completed · ${revisions.active} active`}
              tone="violet"
              icon={
                <svg {...iconProps}>
                  <path d="m5 12.5 4.2 4.2L19 6.8" />
                </svg>
              }
            />
            <StatCard
              label="Tracked activity"
              value={overall.trackedRecords}
              hint={`${studyPlans.total} plans · ${quizzes.totalAttempts} quizzes · ${revisions.total} revisions`}
              tone="indigo"
              icon={
                <svg {...iconProps}>
                  <path d="M12 3 2.8 7.6 12 12.2l9.2-4.6L12 3Z" />
                  <path d="M6.4 10.5v4.1c0 2.2 2.5 3.9 5.6 3.9s5.6-1.7 5.6-3.9v-4.1" />
                </svg>
              }
            />
          </div>

          <div className="analytics-grid">
            <section className="panel">
              <div className="panel__head">
                <div>
                  <span className="panel__eyebrow">Study planner</span>
                  <h2>Plan progress</h2>
                </div>
                <span className="tag">
                  {formatMinutes(studyPlans.estimatedMinutes)} planned
                </span>
              </div>

              <div className="analytics-hero">
                <strong>{studyPlans.completionPercentage}%</strong>
                <span>of all planned topics completed</span>
              </div>
              <div
                className="progress"
                role="progressbar"
                aria-valuemin="0"
                aria-valuemax="100"
                aria-valuenow={studyPlans.completionPercentage}
                aria-label={`Study plan completion: ${studyPlans.completionPercentage}%`}
              >
                <span
                  className="progress__bar"
                  style={{ width: `${studyPlans.completionPercentage}%` }}
                />
              </div>

              <div className="analytics-mini-grid">
                <div>
                  <strong>{studyPlans.active}</strong>
                  <span>Active</span>
                </div>
                <div>
                  <strong>{studyPlans.paused}</strong>
                  <span>Paused</span>
                </div>
                <div>
                  <strong>{studyPlans.completed}</strong>
                  <span>Completed</span>
                </div>
              </div>

              <dl className="analytics-facts">
                <div>
                  <dt>Estimated study time</dt>
                  <dd>{formatMinutes(studyPlans.estimatedMinutes)}</dd>
                </div>
                <div>
                  <dt>Remaining</dt>
                  <dd>{formatMinutes(studyPlans.remainingMinutes)}</dd>
                </div>
              </dl>

              {studyPlans.upcoming.length > 0 ? (
                <ul className="analytics-upcoming">
                  {studyPlans.upcoming.slice(0, 4).map((plan) => (
                    <li key={plan.id}>
                      <div>
                        <strong>{plan.title}</strong>
                        <small>{formatAnalyticsDate(plan.examDate)}</small>
                      </div>
                      <span>{plan.completionPercentage}%</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="analytics-note">
                  No upcoming exam dates are saved in your plans.
                </p>
              )}
            </section>

            <section className="panel">
              <div className="panel__head">
                <div>
                  <span className="panel__eyebrow">Quiz performance</span>
                  <h2>Score trend</h2>
                </div>
                <span className="tag">
                  Last {quizzes.trend.length} attempt
                  {quizzes.trend.length === 1 ? "" : "s"}
                </span>
              </div>

              <ScoreTrendChart trend={quizzes.trend} />

              <div className="analytics-mini-grid analytics-mini-grid--four">
                <div>
                  <strong>{quizzes.averageScore}%</strong>
                  <span>Average</span>
                </div>
                <div>
                  <strong>{quizzes.highestScore}%</strong>
                  <span>Best</span>
                </div>
                <div>
                  <strong>{quizzes.accuracyPercentage}%</strong>
                  <span>Accuracy</span>
                </div>
                <div>
                  <strong>{quizzes.totalAttempts}</strong>
                  <span>Attempts</span>
                </div>
              </div>

              <dl className="analytics-facts">
                <div>
                  <dt>Correct answers</dt>
                  <dd>
                    {quizzes.correctAnswers}/{quizzes.totalQuestions}
                  </dd>
                </div>
                <div>
                  <dt>Latest score</dt>
                  <dd>
                    {quizzes.latestScore === null
                      ? "No attempts"
                      : `${quizzes.latestScore}%`}
                  </dd>
                </div>
              </dl>
            </section>
          </div>

          <section className="panel">
            <div className="panel__head">
              <div>
                <span className="panel__eyebrow">Subject breakdown</span>
                <h2>Where you are strong</h2>
              </div>
              <span className="tag">
                {analytics.subjectPerformance.length} subject
                {analytics.subjectPerformance.length === 1 ? "" : "s"}
              </span>
            </div>

            {analytics.subjectPerformance.length > 0 ? (
              <div className="subject-performance-grid">
                {analytics.subjectPerformance.map((subject) => (
                  <article
                    className="subject-performance"
                    key={subject.id}
                  >
                    <div className="subject-performance__head">
                      <span
                        className="subject-swatch"
                        style={{
                          backgroundColor: subject.color || "#6ea8fe",
                        }}
                        aria-hidden="true"
                      />
                      <strong>{subject.name}</strong>
                      <span
                        className={`subject-performance__badge${subject.hasQuizData ? " is-active" : ""}`}
                      >
                        {subject.hasQuizData ? "Quiz data" : "No quizzes"}
                      </span>
                    </div>

                    <div className="subject-performance__stats">
                      <div>
                        <strong>
                          {subject.plans.completionPercentage}%
                        </strong>
                        <span>Plan progress</span>
                      </div>
                      <div>
                        <strong>
                          {subject.hasQuizData
                            ? `${subject.quizzes.averageScore}%`
                            : "—"}
                        </strong>
                        <span>Quiz average</span>
                      </div>
                      <div>
                        <strong>{subject.quizzes.attempts}</strong>
                        <span>Attempts</span>
                      </div>
                    </div>

                    <div
                      className="progress progress--compact"
                      role="progressbar"
                      aria-valuemin="0"
                      aria-valuemax="100"
                      aria-valuenow={subject.plans.completionPercentage}
                      aria-label={`${subject.name} plan completion: ${subject.plans.completionPercentage}%`}
                    >
                      <span
                        className="progress__bar"
                        style={{
                          width: `${subject.plans.completionPercentage}%`,
                        }}
                      />
                    </div>

                    <p>
                      {subject.plans.completedTopics}/
                      {subject.plans.totalTopics} topics ·{" "}
                      {formatMinutes(subject.plans.remainingMinutes)} left ·{" "}
                      {subject.hasQuizData
                        ? `${subject.quizzes.accuracyPercentage}% quiz accuracy`
                        : "No quiz attempts yet"}
                    </p>
                  </article>
                ))}
              </div>
            ) : (
              <p className="analytics-note">
                Add subjects to your study plans to compare progress here.
              </p>
            )}
          </section>

          <div className="analytics-grid">
            <section className="panel">
              <div className="panel__head">
                <div>
                  <span className="panel__eyebrow">Practice focus</span>
                  <h2>Topic performance</h2>
                </div>
                <span className="tag">At least 2 attempts</span>
              </div>

              {analytics.topicPerformance.length > 0 ? (
                <ul className="topic-performance-list">
                  {analytics.topicPerformance.map((topic) => (
                    <li key={topic.topic}>
                      <div>
                        <strong>{topic.topic}</strong>
                        <small>
                          {topic.attempts} attempts ·{" "}
                          {topic.accuracyPercentage}% accuracy
                        </small>
                      </div>
                      <span
                        className={
                          topic.averageScore < 60
                            ? "topic-score topic-score--weak"
                            : "topic-score"
                        }
                      >
                        {topic.averageScore}%
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="analytics-note">
                  Complete at least two quizzes on the same topic to compare
                  topic performance. One attempt is too little evidence.
                </p>
              )}
            </section>

            <section className="panel">
              <div className="panel__head">
                <div>
                  <span className="panel__eyebrow">Revision queue</span>
                  <h2>Review priorities</h2>
                </div>
                <Link className="text-link" to="/revision">
                  Open revisions
                </Link>
              </div>

              <div className="analytics-mini-grid analytics-mini-grid--four">
                <div>
                  <strong>{revisions.overdue}</strong>
                  <span>Overdue</span>
                </div>
                <div>
                  <strong>{revisions.dueToday}</strong>
                  <span>Due today</span>
                </div>
                <div>
                  <strong>{revisions.upcoming}</strong>
                  <span>Upcoming</span>
                </div>
                <div>
                  <strong>{revisions.unscheduled}</strong>
                  <span>Unscheduled</span>
                </div>
              </div>

              {reminders.length > 0 ? (
                <ul className="analytics-reminders">
                  {reminders.map((item) => (
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
                      <span>{item.reviewCount} reviews</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="analytics-note">
                  Nothing is waiting in your revision queue right now.
                </p>
              )}

              <div className="priority-breakdown">
                {["high", "medium", "low"].map((priority) => (
                  <span
                    className={`priority-pill priority-pill--${priority}`}
                    key={priority}
                  >
                    {revisions.priorityBreakdown[priority]} {priority}
                  </span>
                ))}
              </div>
            </section>
          </div>

          <section className="panel">
            <div className="panel__head">
              <div>
                <span className="panel__eyebrow">Recent attempts</span>
                <h2>Latest quiz results</h2>
              </div>
              <span className="tag">
                {quizzes.totalAttempts} total attempt
                {quizzes.totalAttempts === 1 ? "" : "s"}
              </span>
            </div>

            {analytics.recentQuizzes.length > 0 ? (
              <div className="analytics-table-wrap">
                <table className="analytics-table">
                  <thead>
                    <tr>
                      <th scope="col">Quiz</th>
                      <th scope="col">Subject</th>
                      <th scope="col">Score</th>
                      <th scope="col">Correct</th>
                      <th scope="col">Completed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.recentQuizzes.map((attempt) => (
                      <tr key={attempt.id}>
                        <td>
                          <strong>{attempt.title}</strong>
                          <small>{attempt.topic || "General"}</small>
                        </td>
                        <td>
                          {subjectById.get(attempt.subjectId)?.name ||
                            "General"}
                        </td>
                        <td>{attempt.scorePercentage}%</td>
                        <td>
                          {attempt.correctAnswers}/{attempt.totalQuestions}
                        </td>
                        <td>{formatAnalyticsDate(attempt.completedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="analytics-note">
                Complete a quiz to see your latest results here.
              </p>
            )}

            <p className="analytics-method-note">
              Average score is the unweighted mean of your saved quiz scores.
              Accuracy is correct answers divided by questions answered. Future
              timestamps are excluded, and all day boundaries use UTC.
            </p>
          </section>
        </>
      )}
    </section>
  );
}
