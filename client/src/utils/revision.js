export const REVISION_STATUS_LABELS = {
  pending: "Pending",
  in_progress: "In progress",
  completed: "Mastered",
};

export const REVISION_PRIORITY_LABELS = {
  low: "Low priority",
  medium: "Medium priority",
  high: "High priority",
};

export const REVISION_FILTERS = [
  { id: "all", label: "All items" },
  { id: "overdue", label: "Overdue" },
  { id: "today", label: "Due today" },
  { id: "upcoming", label: "Upcoming" },
  { id: "pending", label: "Pending" },
  { id: "in_progress", label: "In progress" },
  { id: "completed", label: "Mastered" },
];

export function formatRevisionDate(value) {
  if (!value) {
    return "Not scheduled";
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

export function describeRevisionDue(item) {
  if (item.status === "completed") {
    return "Mastered";
  }

  if (item.isOverdue) {
    return `Overdue · ${formatRevisionDate(item.nextReviewAt)}`;
  }

  if (item.isDueToday) {
    return "Due today";
  }

  if (item.isUpcoming) {
    return `Next review ${formatRevisionDate(item.nextReviewAt)}`;
  }

  return "Not scheduled";
}

export function revisionMatchesFilter(item, filter) {
  switch (filter) {
    case "overdue":
      return Boolean(item.isOverdue);
    case "today":
      return Boolean(item.isDueToday);
    case "upcoming":
      return Boolean(item.isUpcoming);
    case "pending":
      return item.status === "pending";
    case "in_progress":
      return item.status === "in_progress";
    case "completed":
      return item.status === "completed";
    default:
      return true;
  }
}

export function getRevisionFilterCounts(items = []) {
  const counts = {
    all: items.length,
    overdue: 0,
    today: 0,
    upcoming: 0,
    pending: 0,
    in_progress: 0,
    completed: 0,
  };

  for (const item of items) {
    if (item.isOverdue) {
      counts.overdue += 1;
    }
    if (item.isDueToday) {
      counts.today += 1;
    }
    if (item.isUpcoming) {
      counts.upcoming += 1;
    }
    if (item.status === "pending") {
      counts.pending += 1;
    } else if (item.status === "in_progress") {
      counts.in_progress += 1;
    } else if (item.status === "completed") {
      counts.completed += 1;
    }
  }

  return counts;
}

export function sortRevisionItems(items = []) {
  return [...items].sort((left, right) => {
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
  });
}

export function getRevisionPayload(form) {
  return {
    topic: form.topic.trim(),
    notes: form.notes.trim(),
    priority: form.priority,
    status: form.status,
    subject: form.subjectId || null,
  };
}

export function validateRevisionPayload(payload) {
  if (!payload.topic) {
    return "Enter a revision topic.";
  }

  if (payload.topic.length > 200) {
    return "Keep the topic under 200 characters.";
  }

  if (payload.notes.length > 3000) {
    return "Keep the notes under 3000 characters.";
  }

  return "";
}
