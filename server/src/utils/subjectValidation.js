import { hasOwn, isPlainObject, normalizeText } from "./validation.js";

const MAX_NAME_LENGTH = 120;
const MAX_DESCRIPTION_LENGTH = 2000;
const MAX_COLOR_LENGTH = 32;

function validateOptionalText(body, field, label, maxLength, data) {
  if (!hasOwn(body, field)) {
    return null;
  }

  const value = body[field];

  if (value === null || value === undefined) {
    data[field] = "";
    return null;
  }

  if (typeof value !== "string") {
    return `${label} must be text.`;
  }

  const normalized = normalizeText(value);

  if (normalized.length > maxLength) {
    return `${label} must be ${maxLength} characters or fewer.`;
  }

  data[field] = normalized;
  return null;
}

export function validateSubjectInput(body, { partial = false } = {}) {
  if (!isPlainObject(body)) {
    return { error: "Provide a valid subject request." };
  }

  const data = {};
  const hasName = hasOwn(body, "name");
  const hasDescription = hasOwn(body, "description");
  const hasColor = hasOwn(body, "color");

  if (partial && !hasName && !hasDescription && !hasColor) {
    return { error: "Provide a subject name, description, or color to update." };
  }

  if (!partial || hasName) {
    if (typeof body.name !== "string" || !body.name.trim()) {
      return { error: "Subject name is required." };
    }

    const name = normalizeText(body.name);

    if (name.length > MAX_NAME_LENGTH) {
      return {
        error: `Subject name must be ${MAX_NAME_LENGTH} characters or fewer.`,
      };
    }

    data.name = name;
  }

  const descriptionError = validateOptionalText(
    body,
    "description",
    "Description",
    MAX_DESCRIPTION_LENGTH,
    data
  );

  if (descriptionError) {
    return { error: descriptionError };
  }

  const colorError = validateOptionalText(
    body,
    "color",
    "Color",
    MAX_COLOR_LENGTH,
    data
  );

  if (colorError) {
    return { error: colorError };
  }

  return { data };
}
