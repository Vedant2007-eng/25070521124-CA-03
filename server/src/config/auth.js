const MIN_SECRET_LENGTH = 32;

const REJECTED_SECRETS = new Set([
  "change_me",
  "changeme",
  "development_secret",
  "jwt_secret",
  "password",
  "replace_with_a_long_random_secret",
  "secret",
  "your_jwt_secret",
]);

export const JWT_ALGORITHM = "HS256";
export const JWT_AUDIENCE = "preppilot-client";
export const JWT_ISSUER = "preppilot-api";
export const JWT_EXPIRES_IN_SECONDS = 60 * 60;

export function validateJwtSecret(secret) {
  if (typeof secret !== "string" || !secret.trim()) {
    return {
      valid: false,
      message: "JWT_SECRET is required.",
    };
  }

  const value = secret.trim();
  const normalized = value.toLowerCase();

  if (value.length < MIN_SECRET_LENGTH) {
    return {
      valid: false,
      message: `JWT_SECRET must be at least ${MIN_SECRET_LENGTH} characters long.`,
    };
  }

  if (
    REJECTED_SECRETS.has(normalized) ||
    /^(replace|change|your)[-_ ]/.test(normalized) ||
    /^(.)\1+$/.test(value)
  ) {
    return {
      valid: false,
      message: "JWT_SECRET must be a strong random value, not a placeholder.",
    };
  }

  return { valid: true, value };
}

export function getJwtSecret() {
  const result = validateJwtSecret(process.env.JWT_SECRET);

  if (!result.valid) {
    throw new Error(result.message);
  }

  return result.value;
}

export function validateAuthConfig() {
  return validateJwtSecret(process.env.JWT_SECRET);
}
