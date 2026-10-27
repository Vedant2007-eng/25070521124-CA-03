const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LENGTH = 254;
const MAX_NAME_LENGTH = 100;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_BYTES = 72;

const OPTIONAL_STRING_FIELDS = [
  { field: "educationLevel", label: "Education level", maxLength: 100 },
  { field: "examTarget", label: "Exam target", maxLength: 150 },
  { field: "preferredStudyTime", label: "Preferred study time", maxLength: 100 },
];

function invalid(message) {
  return { error: message };
}

function isBodyObject(body) {
  return Boolean(body) && typeof body === "object" && !Array.isArray(body);
}

export function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

export function validateRegistrationInput(body) {
  if (!isBodyObject(body)) {
    return invalid("Provide a valid registration request.");
  }

  if (typeof body.name !== "string" || !body.name.trim()) {
    return invalid("Name is required.");
  }

  const name = body.name.trim();

  if (name.length > MAX_NAME_LENGTH) {
    return invalid(`Name must be ${MAX_NAME_LENGTH} characters or fewer.`);
  }

  if (typeof body.email !== "string" || !body.email.trim()) {
    return invalid("Email is required.");
  }

  const email = normalizeEmail(body.email);

  if (email.length > MAX_EMAIL_LENGTH || !EMAIL_PATTERN.test(email)) {
    return invalid("Enter a valid email address.");
  }

  if (typeof body.password !== "string" || body.password.length === 0) {
    return invalid("Password is required.");
  }

  if (body.password.length < MIN_PASSWORD_LENGTH) {
    return invalid(
      `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`
    );
  }

  if (!/\S/.test(body.password)) {
    return invalid("Password cannot contain only spaces.");
  }

  if (Buffer.byteLength(body.password, "utf8") > MAX_PASSWORD_BYTES) {
    return invalid(`Password must be ${MAX_PASSWORD_BYTES} bytes or fewer.`);
  }

  const data = {
    name,
    email,
    password: body.password,
  };

  for (const { field, label, maxLength } of OPTIONAL_STRING_FIELDS) {
    const rawValue = body[field];

    if (rawValue === undefined || rawValue === null) {
      continue;
    }

    if (typeof rawValue !== "string") {
      return invalid(`${label} must be text.`);
    }

    const value = rawValue.trim();

    if (!value) {
      continue;
    }

    if (value.length > maxLength) {
      return invalid(`${label} must be ${maxLength} characters or fewer.`);
    }

    data[field] = value;
  }

  if (body.dailyStudyHours !== undefined && body.dailyStudyHours !== null) {
    const dailyStudyHours = body.dailyStudyHours;

    if (
      typeof dailyStudyHours !== "number" ||
      !Number.isFinite(dailyStudyHours)
    ) {
      return invalid("Daily study hours must be a number.");
    }

    if (dailyStudyHours < 0.5 || dailyStudyHours > 24) {
      return invalid("Daily study hours must be between 0.5 and 24.");
    }

    data.dailyStudyHours = dailyStudyHours;
  }

  return { data };
}

export function validateLoginInput(body) {
  const message = "Enter a valid email and password.";

  if (!isBodyObject(body)) {
    return invalid(message);
  }

  if (typeof body.email !== "string" || !body.email.trim()) {
    return invalid(message);
  }

  const email = normalizeEmail(body.email);

  if (email.length > MAX_EMAIL_LENGTH || !EMAIL_PATTERN.test(email)) {
    return invalid(message);
  }

  if (
    typeof body.password !== "string" ||
    body.password.length === 0 ||
    Buffer.byteLength(body.password, "utf8") > MAX_PASSWORD_BYTES
  ) {
    return invalid(message);
  }

  return {
    data: {
      email,
      password: body.password,
    },
  };
}
