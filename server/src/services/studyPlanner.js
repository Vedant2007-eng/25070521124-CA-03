import { createHash } from "node:crypto";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function startOfUtcDay(value) {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
}

function failure(reason, message, details = {}) {
  return {
    feasible: false,
    reason,
    message,
    details,
  };
}

export function buildStudySchedule({
  examDate,
  dailyStudyHours,
  topics = [],
  now = new Date(),
} = {}) {
  if (!examDate) {
    return failure(
      "exam_date_required",
      "Add an exam date before generating a schedule."
    );
  }

  if (
    typeof dailyStudyHours !== "number" ||
    !Number.isFinite(dailyStudyHours) ||
    dailyStudyHours < 0.5 ||
    dailyStudyHours > 24
  ) {
    return failure(
      "invalid_daily_hours",
      "Daily study hours must be between 0.5 and 24."
    );
  }

  if (!Array.isArray(topics) || topics.length === 0) {
    return failure(
      "no_topics",
      "Add at least one topic before generating a schedule."
    );
  }

  const examDay = startOfUtcDay(examDate);
  const today = startOfUtcDay(now);

  if (!examDay || !today) {
    return failure("invalid_exam_date", "Exam date must be a valid date.");
  }

  if (examDay < today) {
    return failure(
      "exam_date_past",
      "The exam date has already passed. Choose a future exam date."
    );
  }

  const normalizedTopics = [];

  for (const topic of topics) {
    const estimatedMinutes = topic.estimatedMinutes;

    if (
      typeof estimatedMinutes !== "number" ||
      !Number.isFinite(estimatedMinutes) ||
      estimatedMinutes < 1
    ) {
      return failure(
        "invalid_topic",
        "Every topic must have a positive estimated study time."
      );
    }

    normalizedTopics.push({
      topicId: String(topic._id ?? topic.id ?? ""),
      estimatedMinutes,
    });
  }

  const dailyMinutes = dailyStudyHours * 60;
  const availableDays = Math.floor((examDay - today) / MS_PER_DAY) + 1;
  const availableMinutes = availableDays * dailyMinutes;
  const totalStudyMinutes = normalizedTopics.reduce(
    (total, topic) => total + topic.estimatedMinutes,
    0
  );
  const requiredDays = Math.ceil(totalStudyMinutes / dailyMinutes);

  if (requiredDays > availableDays) {
    return failure(
      "insufficient_time",
      `Not enough study time before the exam. ${totalStudyMinutes} minutes are needed, but only ${availableMinutes} minutes are available. Extend the exam date or increase daily study hours.`,
      {
        availableDays,
        requiredDays,
        dailyMinutes,
        availableMinutes,
        totalStudyMinutes,
        deficitMinutes: totalStudyMinutes - availableMinutes,
      }
    );
  }

  const schedule = [];
  let topicIndex = 0;
  let remainingTopicMinutes = normalizedTopics[0]?.estimatedMinutes ?? 0;

  for (let dayIndex = 0; dayIndex < availableDays; dayIndex += 1) {
    if (topicIndex >= normalizedTopics.length) {
      break;
    }

    const date = new Date(today.getTime() + dayIndex * MS_PER_DAY);
    const entries = [];
    let remainingDailyMinutes = dailyMinutes;

    while (remainingDailyMinutes > 0 && topicIndex < normalizedTopics.length) {
      const minutes = Math.min(
        remainingTopicMinutes,
        remainingDailyMinutes
      );
      const topic = normalizedTopics[topicIndex];

      entries.push({
        topicId: topic.topicId,
        minutes,
      });

      remainingTopicMinutes -= minutes;
      remainingDailyMinutes -= minutes;

      if (remainingTopicMinutes === 0) {
        topicIndex += 1;
        remainingTopicMinutes =
          normalizedTopics[topicIndex]?.estimatedMinutes ?? 0;
      }
    }

    if (entries.length > 0) {
      schedule.push({
        date,
        totalMinutes: dailyMinutes - remainingDailyMinutes,
        topics: entries,
      });
    }
  }

  return {
    feasible: true,
    schedule,
    details: {
      availableDays,
      requiredDays,
      dailyMinutes,
      availableMinutes,
      totalStudyMinutes,
      scheduledMinutes: totalStudyMinutes,
    },
  };
}

export function createGenerationKey({
  title,
  description,
  subject,
  examDate,
  dailyStudyHours,
  topics,
}) {
  const subjectId =
    subject && typeof subject === "object"
      ? subject._id ?? subject.id
      : subject;
  const fingerprint = {
    title,
    description: description || "",
    subject: subjectId ? String(subjectId) : null,
    examDate: examDate ? new Date(examDate).toISOString().slice(0, 10) : null,
    dailyStudyHours,
    topics: (topics || []).map((topic) => ({
      title: topic.title,
      description: topic.description || "",
      estimatedMinutes: topic.estimatedMinutes,
    })),
  };

  return createHash("sha256")
    .update(JSON.stringify(fingerprint))
    .digest("hex");
}
