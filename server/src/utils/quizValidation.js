import {
  hasOwn,
  isPlainObject,
  isValidObjectId,
  normalizeText,
} from "./validation.js";

const DIFFICULTIES = new Set(["easy", "medium", "hard"]);
const GENERATION_FIELDS = new Set([
  "subjectId",
  "topic",
  "difficulty",
  "numberOfQuestions",
  "questionType",
  "additionalInstructions",
]);
const SUBMISSION_FIELDS = new Set(["answers"]);
const ANSWER_FIELDS = new Set(["questionIndex", "selectedAnswer"]);
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function onlyAllowedFields(body, allowedFields) {
  return Object.keys(body).every((key) => allowedFields.has(key));
}

function cleanLine(value) {
  return value.replace(/\s+/g, " ").trim();
}

export function validateQuizGenerationInput(body) {
  if (!isPlainObject(body)) {
    return { error: "Quiz settings must be provided as a JSON object." };
  }

  if (!onlyAllowedFields(body, GENERATION_FIELDS)) {
    return { error: "One or more quiz settings are not supported." };
  }

  if (typeof body.topic !== "string") {
    return { error: "Enter a topic for the quiz." };
  }

  const topic = cleanLine(body.topic);

  if (!topic) {
    return { error: "Enter a topic for the quiz." };
  }

  if (topic.length > 200) {
    return { error: "The quiz topic must be 200 characters or fewer." };
  }

  if (
    typeof body.difficulty !== "string" ||
    !DIFFICULTIES.has(body.difficulty)
  ) {
    return {
      error: "Difficulty must be easy, medium, or hard.",
    };
  }

  if (
    !Number.isInteger(body.numberOfQuestions) ||
    body.numberOfQuestions < 1 ||
    body.numberOfQuestions > 20
  ) {
    return {
      error: "The number of questions must be a whole number from 1 to 20.",
    };
  }

  if (
    hasOwn(body, "questionType") &&
    body.questionType !== "mcq"
  ) {
    return { error: "Only multiple-choice quizzes are supported." };
  }

  let subjectId = null;

  if (hasOwn(body, "subjectId") && body.subjectId !== null) {
    if (
      typeof body.subjectId !== "string" ||
      !isValidObjectId(body.subjectId)
    ) {
      return { error: "Choose a valid subject or leave it blank." };
    }

    subjectId = body.subjectId;
  }

  let additionalInstructions = "";

  if (
    hasOwn(body, "additionalInstructions") &&
    body.additionalInstructions !== null
  ) {
    if (typeof body.additionalInstructions !== "string") {
      return { error: "Additional instructions must be text." };
    }

    additionalInstructions = normalizeText(body.additionalInstructions);

    if (additionalInstructions.length > 800) {
      return {
        error: "Additional instructions must be 800 characters or fewer.",
      };
    }
  }

  return {
    data: {
      subjectId,
      topic,
      difficulty: body.difficulty,
      numberOfQuestions: body.numberOfQuestions,
      additionalInstructions,
    },
  };
}

export function validateQuizSubmissionInput(body, totalQuestions) {
  if (!isPlainObject(body)) {
    return { error: "Quiz answers must be provided as a JSON object." };
  }

  if (!onlyAllowedFields(body, SUBMISSION_FIELDS)) {
    return { error: "One or more submission fields are not supported." };
  }

  if (!Array.isArray(body.answers)) {
    return { error: "Provide an answer for every quiz question." };
  }

  if (body.answers.length !== totalQuestions) {
    return { error: "Answer every question before submitting the quiz." };
  }

  const answers = [];

  for (const answer of body.answers) {
    if (!isPlainObject(answer)) {
      return { error: "Each quiz answer must be a JSON object." };
    }

    if (!onlyAllowedFields(answer, ANSWER_FIELDS)) {
      return { error: "One or more answer fields are not supported." };
    }

    if (
      !Number.isInteger(answer.questionIndex) ||
      answer.questionIndex < 0 ||
      answer.questionIndex >= totalQuestions
    ) {
      return { error: "A quiz question reference is invalid." };
    }

    if (typeof answer.selectedAnswer !== "string") {
      return { error: "Choose one answer for every question." };
    }

    const selectedAnswer = normalizeText(answer.selectedAnswer);

    if (!selectedAnswer || selectedAnswer.length > 500) {
      return { error: "Choose one answer for every question." };
    }

    answers.push({
      questionIndex: answer.questionIndex,
      selectedAnswer,
    });
  }

  const indexes = new Set(
    answers.map((answer) => answer.questionIndex)
  );

  if (indexes.size !== totalQuestions) {
    return { error: "Answer every question exactly once." };
  }

  answers.sort((left, right) => left.questionIndex - right.questionIndex);

  return { data: { answers } };
}

function parsePageValue(value, fallback, { min, max, label }) {
  if (value === undefined) {
    return { value: fallback };
  }

  if (typeof value !== "string" || !/^\d+$/.test(value)) {
    return { error: `${label} must be a whole number.` };
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    return {
      error: `${label} must be between ${min} and ${max}.`,
    };
  }

  return { value: parsed };
}

export function validateHistoryQuery(query, maxLimit) {
  const pageResult = parsePageValue(query.page, 1, {
    min: 1,
    max: 1000000,
    label: "Page",
  });

  if (pageResult.error) {
    return pageResult;
  }

  const limitResult = parsePageValue(query.limit, 10, {
    min: 1,
    max: maxLimit,
    label: "Limit",
  });

  if (limitResult.error) {
    return limitResult;
  }

  return {
    data: {
      page: pageResult.value,
      limit: limitResult.value,
    },
  };
}

export function isValidQuizSessionId(value) {
  return typeof value === "string" && UUID_PATTERN.test(value);
}
