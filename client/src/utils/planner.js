export function formatMinutes(minutes) {
  const total = Math.max(0, Math.round(Number(minutes) || 0));

  if (total < 60) {
    return `${total} min`;
  }

  const hours = Math.floor(total / 60);
  const remainder = total % 60;

  return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
}

export function formatStudyDate(value) {
  if (!value) {
    return "No exam date";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Invalid date";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function toDateInputValue(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}

export function todayDateInputValue() {
  const now = new Date();
  const localDate = new Date(
    now.getTime() - now.getTimezoneOffset() * 60 * 1000
  );

  return localDate.toISOString().slice(0, 10);
}

export function computePlanProgress(plan) {
  const topics = Array.isArray(plan?.topics) ? plan.topics : [];
  const totalTopics = topics.length;
  const completedTopics = topics.filter((topic) => topic.completed).length;

  return {
    totalTopics,
    completedTopics,
    completionPercentage:
      totalTopics === 0
        ? 0
        : Math.round((completedTopics / totalTopics) * 100),
  };
}

export function computeDashboardMetrics(plans = []) {
  const metrics = {
    totalPlans: plans.length,
    activePlans: 0,
    pausedPlans: 0,
    completedPlans: 0,
    totalTopics: 0,
    completedTopics: 0,
    completionPercentage: 0,
  };

  for (const plan of plans) {
    if (plan.status === "active") {
      metrics.activePlans += 1;
    } else if (plan.status === "paused") {
      metrics.pausedPlans += 1;
    } else if (plan.status === "completed") {
      metrics.completedPlans += 1;
    }

    const progress = computePlanProgress(plan);
    metrics.totalTopics += progress.totalTopics;
    metrics.completedTopics += progress.completedTopics;
  }

  metrics.completionPercentage =
    metrics.totalTopics === 0
      ? 0
      : Math.round(
          (metrics.completedTopics / metrics.totalTopics) * 100
        );

  return metrics;
}

export function getTopicTitle(plan, topicId) {
  const topic = (plan?.topics || []).find(
    (item) => item.id === topicId
  );

  return topic?.title || "Study topic";
}

export function sortPlans(plans = []) {
  return [...plans].sort((left, right) => {
    const leftTime = new Date(left.createdAt || 0).getTime();
    const rightTime = new Date(right.createdAt || 0).getTime();

    return rightTime - leftTime;
  });
}

export function getApiErrorMessage(
  error,
  fallback = "Something went wrong. Please try again."
) {
  return error?.response?.data?.message || fallback;
}
