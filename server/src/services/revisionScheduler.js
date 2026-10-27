const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const REVISION_INTERVAL_POLICY = Object.freeze([
  { completedReviews: 0, daysUntilNext: 1, label: "Initial review" },
  { completedReviews: 1, daysUntilNext: 3, label: "Second review" },
  { completedReviews: 2, daysUntilNext: 7, label: "Third review" },
  { completedReviews: 3, daysUntilNext: 14, label: "Fourth review" },
  { completedReviews: 4, daysUntilNext: 30, label: "Fifth and later reviews" },
]);

function toValidDate(value) {
  const date = value instanceof Date ? new Date(value) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function addUtcDays(value, days) {
  const date = toValidDate(value);

  if (!date || !Number.isInteger(days)) {
    return null;
  }

  return new Date(date.getTime() + days * MS_PER_DAY);
}

export function startOfUtcDay(value = new Date()) {
  const date = toValidDate(value);

  if (!date) {
    return null;
  }

  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
}

export function startOfNextUtcDay(value = new Date()) {
  const start = startOfUtcDay(value);
  return start ? addUtcDays(start, 1) : null;
}

export function getRevisionIntervalDays(completedReviewCount) {
  const count =
    Number.isInteger(completedReviewCount) && completedReviewCount > 0
      ? completedReviewCount
      : 0;

  if (count === 0) {
    return 1;
  }
  if (count === 1) {
    return 3;
  }
  if (count === 2) {
    return 7;
  }
  if (count === 3) {
    return 14;
  }

  return 30;
}

export function scheduleInitialReview(from = new Date()) {
  return addUtcDays(from, getRevisionIntervalDays(0));
}

export function scheduleNextReview(from, completedReviewCount) {
  return addUtcDays(from, getRevisionIntervalDays(completedReviewCount));
}

export function getRevisionTiming(
  nextReviewAt,
  { status = "pending", now = new Date() } = {}
) {
  const result = {
    isOverdue: false,
    isDueToday: false,
    isUpcoming: false,
    isCompleted: status === "completed",
  };

  if (result.isCompleted || !nextReviewAt) {
    return result;
  }

  const reviewDate = toValidDate(nextReviewAt);
  const today = startOfUtcDay(now);

  if (!reviewDate || !today) {
    return result;
  }

  const tomorrow = addUtcDays(today, 1);

  if (reviewDate < today) {
    result.isOverdue = true;
  } else if (reviewDate < tomorrow) {
    result.isDueToday = true;
  } else {
    result.isUpcoming = true;
  }

  return result;
}

export { MS_PER_DAY };
