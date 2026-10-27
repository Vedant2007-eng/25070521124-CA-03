const DEFAULT_GROQ_MODEL = "openai/gpt-oss-120b";
const DEFAULT_GROQ_BASE_URL = "https://api.groq.com/openai/v1";

function readPositiveNumber(value, fallback) {
  const parsed = Number(value);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function readPositiveInteger(value, fallback) {
  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function getQuizAiConfig(env = process.env) {
  return {
    apiKey: String(env.GROQ_API_KEY || "").trim(),
    model:
      String(env.GROQ_MODEL || "").trim() || DEFAULT_GROQ_MODEL,
    baseUrl: (
      String(env.GROQ_BASE_URL || "").trim() || DEFAULT_GROQ_BASE_URL
    ).replace(/\/+$/, ""),
    timeoutMs: readPositiveInteger(env.GROQ_TIMEOUT_MS, 30000),
  };
}

export function getQuizSettings(env = process.env) {
  const sessionTtlMinutes = readPositiveNumber(
    env.QUIZ_SESSION_TTL_MINUTES,
    30
  );

  return {
    sessionTtlMs: Math.max(1, Math.round(sessionTtlMinutes * 60000)),
    generationRateLimit: readPositiveInteger(
      env.QUIZ_GENERATION_RATE_LIMIT,
      10
    ),
    generationRateWindowMs:
      readPositiveNumber(env.QUIZ_GENERATION_RATE_WINDOW_MINUTES, 10) * 60000,
    historyDefaultLimit: 10,
    historyMaxLimit: 50,
  };
}
