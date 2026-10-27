export const EMPTY_ANALYTICS = {
  studyPlans: {
    total: 0,
    active: 0,
    paused: 0,
    completed: 0,
    totalTopics: 0,
    completedTopics: 0,
    completionPercentage: 0,
    estimatedMinutes: 0,
    remainingMinutes: 0,
    upcoming: [],
  },
  quizzes: {
    totalAttempts: 0,
    averageScore: 0,
    highestScore: 0,
    latestScore: null,
    correctAnswers: 0,
    totalQuestions: 0,
    accuracyPercentage: 0,
    trend: [],
  },
  revisions: {
    total: 0,
    pending: 0,
    inProgress: 0,
    active: 0,
    dueToday: 0,
    overdue: 0,
    upcoming: 0,
    unscheduled: 0,
    completed: 0,
    completionPercentage: 0,
    totalReviews: 0,
    reminders: { overdue: [], dueToday: [], upcoming: [] },
    priorityBreakdown: { low: 0, medium: 0, high: 0 },
  },
  overall: {
    studyCompletionPercentage: 0,
    quizAverageScore: 0,
    revisionCompletionPercentage: 0,
    trackedRecords: 0,
  },
  subjectPerformance: [],
  topicPerformance: [],
  recentQuizzes: [],
  recentActivity: [],
};

export const ACTIVITY_COPY = {
  study_plan: {
    created: "created a study plan",
    updated: "updated a study plan",
  },
  quiz: {
    completed: "completed a quiz",
  },
  revision: {
    created: "added a revision item",
    reviewed: "reviewed a revision item",
    mastered: "mastered a revision item",
    updated: "updated a revision item",
  },
};

export function normalizeAnalytics(data = {}) {
  return {
    ...EMPTY_ANALYTICS,
    ...data,
    studyPlans: {
      ...EMPTY_ANALYTICS.studyPlans,
      ...(data.studyPlans || {}),
    },
    quizzes: {
      ...EMPTY_ANALYTICS.quizzes,
      ...(data.quizzes || {}),
    },
    revisions: {
      ...EMPTY_ANALYTICS.revisions,
      ...(data.revisions || {}),
      reminders: {
        ...EMPTY_ANALYTICS.revisions.reminders,
        ...(data.revisions?.reminders || {}),
      },
      priorityBreakdown: {
        ...EMPTY_ANALYTICS.revisions.priorityBreakdown,
        ...(data.revisions?.priorityBreakdown || {}),
      },
    },
    overall: {
      ...EMPTY_ANALYTICS.overall,
      ...(data.overall || {}),
    },
    subjectPerformance: Array.isArray(data.subjectPerformance)
      ? data.subjectPerformance
      : [],
    topicPerformance: Array.isArray(data.topicPerformance)
      ? data.topicPerformance
      : [],
    recentQuizzes: Array.isArray(data.recentQuizzes)
      ? data.recentQuizzes
      : [],
    recentActivity: Array.isArray(data.recentActivity)
      ? data.recentActivity
      : [],
  };
}

function toDate(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatAnalyticsDate(value) {
  const date = toDate(value);

  if (!date) {
    return "No date";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function formatAnalyticsDateTime(value) {
  const date = toDate(value);

  if (!date) {
    return "";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(date);
}

export function describeActivity(event) {
  const action = ACTIVITY_COPY[event?.type]?.[event?.action] || event?.action;
  const scoreSuffix =
    event?.type === "quiz" && Number.isFinite(event?.scorePercentage)
      ? ` · ${event.scorePercentage}%`
      : "";

  return `You ${action}${scoreSuffix}`;
}
