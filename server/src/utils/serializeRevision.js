import { getRevisionTiming } from "../services/revisionScheduler.js";

function serializeSubject(subject) {
  if (!subject) {
    return null;
  }

  if (typeof subject === "string") {
    return { id: subject, name: "", color: "" };
  }

  const document = subject.toObject ? subject.toObject() : subject;

  return {
    id: String(document._id ?? document.id),
    name: document.name || "",
    color: document.color || "",
  };
}

export function serializeRevision(item, { now = new Date() } = {}) {
  const document = item.toObject ? item.toObject() : item;
  const timing = getRevisionTiming(document.nextReviewAt, {
    status: document.status,
    now,
  });

  return {
    id: String(document._id ?? document.id),
    topic: document.topic,
    notes: document.notes || "",
    priority: document.priority,
    status: document.status,
    subject: serializeSubject(document.subject),
    nextReviewAt: document.nextReviewAt || null,
    lastReviewedAt: document.lastReviewedAt || null,
    reviewCount: document.reviewCount || 0,
    sourcePlanId: document.sourcePlan
      ? String(document.sourcePlan)
      : null,
    sourceTopicId: document.sourceTopic
      ? String(document.sourceTopic)
      : null,
    isOverdue: timing.isOverdue,
    isDueToday: timing.isDueToday,
    isUpcoming: timing.isUpcoming,
    isCompleted: timing.isCompleted,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}

export function sortRevisions(left, right) {
  const leftCompleted = left.status === "completed";
  const rightCompleted = right.status === "completed";

  if (leftCompleted !== rightCompleted) {
    return leftCompleted ? 1 : -1;
  }

  const leftTime = left.nextReviewAt
    ? new Date(left.nextReviewAt).getTime()
    : Number.POSITIVE_INFINITY;
  const rightTime = right.nextReviewAt
    ? new Date(right.nextReviewAt).getTime()
    : Number.POSITIVE_INFINITY;

  if (leftTime !== rightTime) {
    return leftTime - rightTime;
  }

  return (
    new Date(right.createdAt || 0).getTime() -
    new Date(left.createdAt || 0).getTime()
  );
}
