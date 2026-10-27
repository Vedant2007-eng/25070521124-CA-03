function serializeSubjectReference(subject) {
  if (!subject) {
    return null;
  }

  if (typeof subject === "string") {
    return { id: subject };
  }

  const document = subject.toObject ? subject.toObject() : subject;

  if (document.name === undefined) {
    return { id: String(document._id ?? document.id) };
  }

  return {
    id: String(document._id ?? document.id),
    name: document.name,
    color: document.color || "",
  };
}

function serializeTopic(topic) {
  const document = topic.toObject ? topic.toObject() : topic;

  return {
    id: String(document._id ?? document.id),
    title: document.title,
    description: document.description || "",
    completed: Boolean(document.completed),
    estimatedMinutes: document.estimatedMinutes,
    order: document.order,
  };
}

function serializeSchedule(schedule = []) {
  return schedule.map((day) => ({
    date: day.date,
    totalMinutes: day.totalMinutes,
    topics: (day.topics || []).map((entry) => ({
      topicId: String(entry.topicId),
      minutes: entry.minutes,
    })),
  }));
}

export function calculatePlanProgress(topics = []) {
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

export function serializeStudyPlan(plan) {
  const document = plan.toObject ? plan.toObject() : plan;
  const topics = (document.topics || []).map(serializeTopic);

  return {
    id: String(document._id ?? document.id),
    title: document.title,
    description: document.description || "",
    subject: serializeSubjectReference(document.subject),
    examDate: document.examDate || null,
    dailyStudyHours: document.dailyStudyHours,
    topics,
    schedule: serializeSchedule(document.schedule),
    status: document.status,
    progress: calculatePlanProgress(topics),
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}
