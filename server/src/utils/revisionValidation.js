import {
  hasOwn,
  isPlainObject,
  isValidObjectId,
  normalizeText,
} from "./validation.js";

const MAX_TOPIC_LENGTH = 200;
const MAX_NOTES_LENGTH = 3000;
const PRIORITIES = ["low", "medium", "high"];
const STATUSES = ["pending", "in_progress", "completed"];
const EDITABLE_FIELDS = new Set([
  "topic",
  "notes",
  "priority",
  "status",
  "subject",
]);

function validateEditableFields(body, { partial }) {
  if (!isPlainObject(body)) {
    return { error: "Provide a valid revision request." };
  }

  const unknownField = Object.keys(body).find(
    (field) => !EDITABLE_FIELDS.has(field)
  );

  if (unknownField) {
    return {
      error: `The "${unknownField}" field cannot be set directly. Review dates and counts are managed by the server.`,
    };
  }

  if (partial && Object.keys(body).length === 0) {
    return { error: "Provide at least one revision field to update." };
  }

  return null;
}

export function validateRevisionInput(body, { partial = false } = {}) {
  const fieldsError = validateEditableFields(body, { partial });

  if (fieldsError) {
    return fieldsError;
  }

  const data = {};

  if (!partial || hasOwn(body, "topic")) {
    if (typeof body.topic !== "string") {
      return { error: "Topic is required." };
    }

    const topic = normalizeText(body.topic);

    if (!topic) {
      return { error: "Topic is required." };
    }

    if (topic.length > MAX_TOPIC_LENGTH) {
      return {
        error: `Topic must be ${MAX_TOPIC_LENGTH} characters or fewer.`,
      };
    }

    data.topic = topic;
  }

  if (hasOwn(body, "notes")) {
    if (body.notes === null || body.notes === undefined) {
      data.notes = "";
    } else if (typeof body.notes !== "string") {
      return { error: "Notes must be text." };
    } else {
      const notes = normalizeText(body.notes);

      if (notes.length > MAX_NOTES_LENGTH) {
        return {
          error: `Notes must be ${MAX_NOTES_LENGTH} characters or fewer.`,
        };
      }

      data.notes = notes;
    }
  }

  if (hasOwn(body, "priority")) {
    if (!PRIORITIES.includes(body.priority)) {
      return {
        error: `Priority must be one of: ${PRIORITIES.join(", ")}.`,
      };
    }

    data.priority = body.priority;
  }

  if (hasOwn(body, "status")) {
    if (!STATUSES.includes(body.status)) {
      return {
        error: `Status must be one of: ${STATUSES.join(", ")}.`,
      };
    }

    data.status = body.status;
  }

  if (hasOwn(body, "subject")) {
    if (
      body.subject === null ||
      body.subject === undefined ||
      body.subject === ""
    ) {
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

  return { data };
}

export function validateRevisionReview(body) {
  if (!isPlainObject(body)) {
    return { error: "Provide a valid review request." };
  }

  const keys = Object.keys(body);

  if (keys.some((key) => key !== "mastered")) {
    return {
      error:
        "Only the mastered value can be recorded. Review dates and counts are managed by the server.",
    };
  }

  if (hasOwn(body, "mastered") && typeof body.mastered !== "boolean") {
    return { error: "Mastered must be true or false." };
  }

  return {
    data: {
      mastered: body.mastered === true,
    },
  };
}
