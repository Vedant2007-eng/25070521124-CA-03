import {
  hasOwn,
  isPlainObject,
  isValidObjectId,
  normalizeText,
} from "./validation.js";

const MAX_TOPICS = 100;
const MAX_TITLE_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 2000;
const MAX_TOPIC_DESCRIPTION_LENGTH = 2000;
const MAX_ESTIMATED_MINUTES = 1440;
const PLAN_STATUSES = ["active", "completed", "paused"];

function validateText(value, label, maxLength, { required = false } = {}) {
  if (value === null || value === undefined) {
    return required
      ? { error: `${label} is required.` }
      : { value: "" };
  }

  if (typeof value !== "string") {
    return { error: `${label} must be text.` };
  }

  const normalized = normalizeText(value);

  if (required && !normalized) {
    return { error: `${label} is required.` };
  }

  if (normalized.length > maxLength) {
    return { error: `${label} must be ${maxLength} characters or fewer.` };
  }

  return { value: normalized };
}

export function normalizeExamDate(value) {
  if (value === null || value === undefined || value === "") {
    return { value: null };
  }

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      return { error: "Exam date must be a valid date." };
    }

    return {
      value: new Date(
        Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate())
      ),
    };
  }

  if (typeof value !== "string") {
    return { error: "Exam date must be a valid date." };
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/.exec(value.trim());

  if (!match) {
    return { error: "Exam date must use the YYYY-MM-DD format." };
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return { error: "Exam date must be a valid date." };
  }

  return { value: date };
}

function normalizeTopics(value, existingTopics) {
  if (!Array.isArray(value)) {
    return { error: "Topics must be a list." };
  }

  if (value.length > MAX_TOPICS) {
    return { error: `A plan can contain at most ${MAX_TOPICS} topics.` };
  }

  const existingById = new Map(
    existingTopics.map((topic) => [String(topic._id), topic])
  );
  const seenIds = new Set();
  const topics = [];

  for (let index = 0; index < value.length; index += 1) {
    const topic = value[index];

    if (!isPlainObject(topic)) {
      return { error: `Topic ${index + 1} is invalid.` };
    }

    const titleResult = validateText(
      topic.title,
      `Topic ${index + 1} title`,
      MAX_TITLE_LENGTH,
      { required: true }
    );

    if (titleResult.error) {
      return { error: titleResult.error };
    }

    const descriptionResult = validateText(
      topic.description,
      `Topic ${index + 1} description`,
      MAX_TOPIC_DESCRIPTION_LENGTH
    );

    if (descriptionResult.error) {
      return { error: descriptionResult.error };
    }

    let existingTopic = null;
    let topicId = null;

    if (hasOwn(topic, "id") && topic.id !== null && topic.id !== undefined) {
      if (!isValidObjectId(topic.id)) {
        return { error: `Topic ${index + 1} ID is invalid.` };
      }

      topicId = String(topic.id);
      existingTopic = existingById.get(topicId) || null;

      if (!existingTopic) {
        return { error: `Topic ${index + 1} was not found in this plan.` };
      }

      if (seenIds.has(topicId)) {
        return { error: "Topic IDs must be unique within a plan." };
      }

      seenIds.add(topicId);
    }

    let estimatedMinutes = existingTopic?.estimatedMinutes ?? 30;

    if (hasOwn(topic, "estimatedMinutes")) {
      if (
        typeof topic.estimatedMinutes !== "number" ||
        !Number.isFinite(topic.estimatedMinutes) ||
        !Number.isInteger(topic.estimatedMinutes) ||
        topic.estimatedMinutes < 1 ||
        topic.estimatedMinutes > MAX_ESTIMATED_MINUTES
      ) {
        return {
          error: `Topic ${index + 1} estimated minutes must be between 1 and ${MAX_ESTIMATED_MINUTES}.`,
        };
      }

      estimatedMinutes = topic.estimatedMinutes;
    }

    let completed = existingTopic?.completed ?? false;

    if (hasOwn(topic, "completed")) {
      if (typeof topic.completed !== "boolean") {
        return {
          error: `Topic ${index + 1} completed must be true or false.`,
        };
      }

      completed = topic.completed;
    }

    const normalizedTopic = {
      title: titleResult.value,
      description: hasOwn(topic, "description")
        ? descriptionResult.value
        : existingTopic?.description || "",
      completed,
      estimatedMinutes,
      order: index,
    };

    if (topicId) {
      normalizedTopic._id = topicId;
    }

    topics.push(normalizedTopic);
  }

  return { topics };
}

export function validateStudyPlanInput(
  body,
  { partial = false, existingTopics = [] } = {}
) {
  if (!isPlainObject(body)) {
    return { error: "Provide a valid study plan request." };
  }

  const data = {};
  const recognizedFields = [
    "title",
    "description",
    "subject",
    "examDate",
    "dailyStudyHours",
    "topics",
    "status",
  ];
  const hasRecognizedField = recognizedFields.some((field) =>
    hasOwn(body, field)
  );

  if (partial && !hasRecognizedField) {
    return { error: "Provide at least one study plan field to update." };
  }

  if (!partial || hasOwn(body, "title")) {
    const titleResult = validateText(
      body.title,
      "Plan title",
      MAX_TITLE_LENGTH,
      { required: true }
    );

    if (titleResult.error) {
      return { error: titleResult.error };
    }

    data.title = titleResult.value;
  }

  if (hasOwn(body, "description")) {
    const descriptionResult = validateText(
      body.description,
      "Plan description",
      MAX_DESCRIPTION_LENGTH
    );

    if (descriptionResult.error) {
      return { error: descriptionResult.error };
    }

    data.description = descriptionResult.value;
  }

  if (hasOwn(body, "subject")) {
    if (body.subject === null || body.subject === undefined || body.subject === "") {
      data.subject = null;
    } else if (
      typeof body.subject !== "string" ||
      !isValidObjectId(body.subject)
    ) {
      return { error: "Subject ID is invalid." };
    } else {
      data.subject = body.subject;
    }
  }

  if (hasOwn(body, "examDate")) {
    const examDateResult = normalizeExamDate(body.examDate);

    if (examDateResult.error) {
      return { error: examDateResult.error };
    }

    data.examDate = examDateResult.value;
  }

  if (!partial || hasOwn(body, "dailyStudyHours")) {
    if (
      typeof body.dailyStudyHours !== "number" ||
      !Number.isFinite(body.dailyStudyHours) ||
      body.dailyStudyHours < 0.5 ||
      body.dailyStudyHours > 24
    ) {
      return {
        error: "Daily study hours must be a number between 0.5 and 24.",
      };
    }

    data.dailyStudyHours = body.dailyStudyHours;
  }

  if (hasOwn(body, "topics")) {
    const topicsResult = normalizeTopics(body.topics, existingTopics);

    if (topicsResult.error) {
      return { error: topicsResult.error };
    }

    data.topics = topicsResult.topics;
  } else if (!partial) {
    data.topics = [];
  }

  if (hasOwn(body, "status")) {
    if (!PLAN_STATUSES.includes(body.status)) {
      return {
        error: `Status must be one of: ${PLAN_STATUSES.join(", ")}.`,
      };
    }

    data.status = body.status;
  }

  return {
    data,
    topicsChanged: hasOwn(body, "topics"),
  };
}

export function validateTopicCompletion(body) {
  if (!isPlainObject(body)) {
    return { error: "Provide a valid topic update." };
  }

  const keys = Object.keys(body);

  if (keys.length !== 1 || keys[0] !== "completed") {
    return { error: "Only the topic completed value can be updated." };
  }

  if (typeof body.completed !== "boolean") {
    return { error: "Completed must be true or false." };
  }

  return { data: { completed: body.completed } };
}
