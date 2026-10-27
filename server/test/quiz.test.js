import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { after, before, beforeEach, test } from "node:test";
import mongoose from "mongoose";

const runId = randomBytes(6).toString("hex");
const allowedOrigin = "http://localhost:5173";
const testMongoUri =
  process.env.MONGODB_TEST_URI ||
  "mongodb://127.0.0.1:27017/preppilot_ai_quiz_test";

process.env.NODE_ENV = "test";
process.env.CLIENT_URL = allowedOrigin;
process.env.JWT_SECRET = randomBytes(48).toString("hex");
process.env.GROQ_API_KEY = "test-groq-key";
process.env.GROQ_MODEL = "test-groq-model";
process.env.GROQ_BASE_URL = "https://groq.test/v1";
process.env.GROQ_TIMEOUT_MS = "1000";
process.env.QUIZ_GENERATION_RATE_LIMIT = "1000";
process.env.QUIZ_SESSION_TTL_MINUTES = "30";

const realFetch = globalThis.fetch;
const mockState = {
  mode: "success",
  lastRequest: null,
  providerCalls: 0,
};

function makeQuestion(index) {
  return {
    questionText: `Generated question ${index + 1}?`,
    options: [
      `Correct ${index + 1}`,
      `Distractor A ${index + 1}`,
      `Distractor B ${index + 1}`,
      `Distractor C ${index + 1}`,
    ],
    correctAnswer: `Correct ${index + 1}`,
    explanation: `Explanation for question ${index + 1}.`,
  };
}

function makeQuestions(count) {
  return Array.from({ length: count }, (_value, index) =>
    makeQuestion(index)
  );
}

function jsonResponse(payload, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(payload),
  };
}

function contentResponse(content, status = 200) {
  return jsonResponse(
    { choices: [{ message: { content } }] },
    status
  );
}

function providerResponse(mode, userPayload) {
  if (mode === "http-500") {
    return jsonResponse({ error: "provider down" }, 500);
  }

  if (mode === "http-429") {
    return jsonResponse({ error: "rate limited" }, 429);
  }

  if (mode === "http-401") {
    return jsonResponse({ error: "invalid key" }, 401);
  }

  if (mode === "invalid-json") {
    return contentResponse("this is not json");
  }

  const count = userPayload.numberOfQuestions;
  let questions = makeQuestions(count);

  if (mode === "count-mismatch") {
    questions = makeQuestions(count + 1);
  } else if (mode === "duplicate-options") {
    questions[0].options[1] = questions[0].options[0];
  } else if (mode === "invalid-correct") {
    questions[0].correctAnswer = "An option that is not present";
  } else if (mode === "three-options") {
    questions[0].options = questions[0].options.slice(0, 3);
  } else if (mode === "missing-explanation") {
    questions[0].explanation = "";
  }

  return contentResponse(JSON.stringify({ questions }));
}

function installFetchMock() {
  globalThis.fetch = async (url, options = {}) => {
    const requestUrl = String(url);

    if (!requestUrl.startsWith(process.env.GROQ_BASE_URL)) {
      return realFetch(url, options);
    }

    mockState.providerCalls += 1;
    const requestBody = JSON.parse(options.body);
    mockState.lastRequest = {
      model: requestBody.model,
      body: requestBody,
      authorization: options.headers.Authorization,
    };
    const userPayload = JSON.parse(requestBody.messages[1].content);

    if (mockState.mode === "network") {
      throw new TypeError("network unavailable");
    }

    if (mockState.mode === "timeout") {
      return new Promise((_resolve, reject) => {
        const abort = () => {
          reject(
            Object.assign(new Error("aborted"), {
              name: "AbortError",
            })
          );
        };

        options.signal?.addEventListener("abort", abort, {
          once: true,
        });
      });
    }

    return providerResponse(mockState.mode, userPayload);
  };
}

let app;
let User;
let Subject;
let QuizAttempt;
let signAccessToken;
let quizSessionStore;
let QuizSessionStore;
let createQuizRateLimiter;
let server;
let baseUrl;
let owner;
let otherOwner;
let historyOwner;
let ownerSubject;
let otherSubject;
let ownerToken;
let otherOwnerToken;
let historyOwnerToken;
const createdUserIds = [];

function makeEmail(label) {
  return `quiz-test-${runId}-${label}@example.com`;
}

async function apiRequest(
  path,
  { method = "GET", body, token, headers = {} } = {}
) {
  const requestHeaders = {
    Origin: allowedOrigin,
    ...headers,
  };

  if (body !== undefined) {
    requestHeaders["Content-Type"] = "application/json";
  }

  if (token) {
    requestHeaders.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: requestHeaders,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let data = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  return { status: response.status, body: data, text };
}

function quizBody(overrides = {}) {
  return {
    topic: "Algebra basics",
    difficulty: "medium",
    numberOfQuestions: 3,
    questionType: "mcq",
    ...overrides,
  };
}

async function generateQuizRequest(token, overrides = {}) {
  return apiRequest("/api/quizzes/generate", {
    method: "POST",
    token,
    body: quizBody(overrides),
  });
}

async function generateValidQuiz(token, overrides = {}) {
  const response = await generateQuizRequest(token, overrides);

  assert.equal(response.status, 200, response.text);
  return response.body.quiz;
}

function buildAnswers(session, { wrongIndex = null } = {}) {
  return {
    answers: session.questions.map((question, index) => ({
      questionIndex: index,
      selectedAnswer:
        index === wrongIndex
          ? question.options.find(
              (option) => option !== question.correctAnswer
            )
          : question.correctAnswer,
    })),
  };
}

async function createSubject(token, name) {
  const response = await apiRequest("/api/subjects", {
    method: "POST",
    token,
    body: {
      name,
      description: "Quiz test subject",
      color: "#38bdf8",
    },
  });

  assert.equal(response.status, 201);
  return response.body.subject;
}

before(async () => {
  const databaseName = decodeURIComponent(
    new URL(testMongoUri).pathname.replace(/^\/+/, "").split("/")[0]
  );

  assert.match(
    databaseName,
    /(^|[-_])test([-_]|$)/i,
    "MONGODB_TEST_URI must point to a dedicated test database."
  );

  await mongoose.connect(testMongoUri, {
    serverSelectionTimeoutMS: 5000,
  });

  installFetchMock();

  ({ default: app } = await import("../src/app.js"));
  ({ default: User } = await import("../src/models/User.js"));
  ({ default: Subject } = await import("../src/models/Subject.js"));
  ({ default: QuizAttempt } = await import("../src/models/QuizAttempt.js"));
  ({ signAccessToken } = await import("../src/utils/tokens.js"));
  ({ quizSessionStore } = await import(
    "../src/services/quizSessionStore.js"
  ));
  ({ QuizSessionStore } = await import(
    "../src/services/quizSessionStore.js"
  ));
  ({ createQuizRateLimiter } = await import(
    "../src/middleware/quizRateLimit.js"
  ));

  await Promise.all([User.init(), Subject.init(), QuizAttempt.init()]);

  owner = await User.create({
    name: "Quiz Owner",
    email: makeEmail("owner"),
    password: "test-password",
  });
  otherOwner = await User.create({
    name: "Quiz Other",
    email: makeEmail("other"),
    password: "test-password",
  });
  historyOwner = await User.create({
    name: "Quiz History",
    email: makeEmail("history"),
    password: "test-password",
  });
  createdUserIds.push(owner._id, otherOwner._id, historyOwner._id);
  ownerToken = signAccessToken(owner._id);
  otherOwnerToken = signAccessToken(otherOwner._id);
  historyOwnerToken = signAccessToken(historyOwner._id);

  await new Promise((resolve, reject) => {
    server = app.listen(0, "127.0.0.1", resolve);
    server.once("error", reject);
  });

  baseUrl = `http://127.0.0.1:${server.address().port}`;

  ownerSubject = await createSubject(ownerToken, "Quiz Physics");
  otherSubject = await createSubject(otherOwnerToken, "Other Physics");
});

beforeEach(() => {
  mockState.mode = "success";
  mockState.lastRequest = null;
  mockState.providerCalls = 0;
  process.env.GROQ_API_KEY = "test-groq-key";
  process.env.GROQ_TIMEOUT_MS = "1000";
});

after(async () => {
  quizSessionStore?.clear();
  globalThis.fetch = realFetch;

  if (QuizAttempt) {
    await QuizAttempt.deleteMany({
      owner: { $in: createdUserIds },
    });
  }
  if (Subject) {
    await Subject.deleteMany({ owner: { $in: createdUserIds } });
  }
  if (User) {
    await User.deleteMany({ _id: { $in: createdUserIds } });
  }

  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }

  await mongoose.disconnect();
});

test("quiz endpoints require authentication", async () => {
  const generateResponse = await generateQuizRequest(null);
  const historyResponse = await apiRequest("/api/quizzes/history");
  const submitResponse = await apiRequest(
    "/api/quizzes/00000000-0000-4000-8000-000000000000/submit",
    {
      method: "POST",
      body: { answers: [] },
    }
  );

  for (const response of [
    generateResponse,
    historyResponse,
    submitResponse,
  ]) {
    assert.equal(response.status, 401);
    assert.equal(response.body.message, "Authentication required.");
  }
});

test("quiz generation validates every request field", async () => {
  const cases = [
    [{ topic: "" }, /Enter a topic/],
    [{ topic: "x".repeat(201) }, /200 characters/],
    [{ difficulty: "expert" }, /Difficulty must be/],
    [{ numberOfQuestions: 0 }, /whole number from 1 to 20/],
    [{ numberOfQuestions: 21 }, /whole number from 1 to 20/],
    [{ numberOfQuestions: 2.5 }, /whole number from 1 to 20/],
    [{ numberOfQuestions: "3" }, /whole number from 1 to 20/],
    [{ questionType: "short-answer" }, /Only multiple-choice/],
    [
      { additionalInstructions: "x".repeat(801) },
      /800 characters or fewer/,
    ],
    [{ owner: String(owner._id) }, /settings are not supported/],
    [{ subjectId: "not-an-object-id" }, /valid subject/],
  ];

  for (const [overrides, message] of cases) {
    const response = await generateQuizRequest(ownerToken, overrides);
    assert.equal(response.status, 400, JSON.stringify(overrides));
    assert.match(response.body.message, message);
  }

  assert.equal(mockState.providerCalls, 0);
});

test("quiz generation rejects subjects owned by another user", async () => {
  const response = await generateQuizRequest(ownerToken, {
    subjectId: otherSubject.id,
  });

  assert.equal(response.status, 404);
  assert.equal(response.body.message, "Subject not found.");
  assert.equal(mockState.providerCalls, 0);
});

test("quiz generation reports a missing AI configuration safely", async () => {
  process.env.GROQ_API_KEY = "";

  const response = await generateQuizRequest(ownerToken);

  assert.equal(response.status, 503);
  assert.equal(response.body.reason, "ai_not_configured");
  assert.match(response.body.message, /not configured/);
  assert.equal(mockState.providerCalls, 0);
});

test("quiz generation maps provider timeouts and outages safely", async () => {
  mockState.mode = "timeout";
  process.env.GROQ_TIMEOUT_MS = "20";
  const timeoutResponse = await generateQuizRequest(ownerToken);

  assert.equal(timeoutResponse.status, 504);
  assert.equal(timeoutResponse.body.reason, "ai_timeout");

  process.env.GROQ_TIMEOUT_MS = "1000";
  mockState.mode = "network";
  const networkResponse = await generateQuizRequest(ownerToken);

  assert.equal(networkResponse.status, 503);
  assert.equal(networkResponse.body.reason, "ai_unavailable");
});

test("quiz generation maps provider status and payload failures", async () => {
  const cases = [
    ["http-500", 503, "ai_unavailable"],
    ["http-429", 503, "ai_rate_limited"],
    ["http-401", 502, "ai_auth_failed"],
    ["invalid-json", 502, "ai_invalid_response"],
    ["count-mismatch", 502, "ai_invalid_response"],
    ["duplicate-options", 502, "ai_invalid_response"],
    ["invalid-correct", 502, "ai_invalid_response"],
    ["three-options", 502, "ai_invalid_response"],
    ["missing-explanation", 502, "ai_invalid_response"],
  ];

  for (const [mode, status, reason] of cases) {
    mockState.mode = mode;
    const response = await generateQuizRequest(ownerToken);

    assert.equal(response.status, status, mode);
    assert.equal(response.body.reason, reason, mode);
    assert.equal(response.body.success, false);
  }
});

test("quiz generation returns normalized questions without the answer key", async () => {
  const response = await generateQuizRequest(ownerToken, {
    subjectId: ownerSubject.id,
    topic: "  Linear   equations ",
    difficulty: "hard",
    numberOfQuestions: 4,
    additionalInstructions: "  Focus on word problems.  ",
  });

  assert.equal(response.status, 200, response.text);
  const { quiz } = response.body;

  assert.match(
    quiz.id,
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  );
  assert.equal(quiz.topic, "Linear equations");
  assert.equal(quiz.difficulty, "hard");
  assert.equal(quiz.questionCount, 4);
  assert.equal(quiz.questions.length, 4);
  assert.equal(quiz.subject.id, ownerSubject.id);
  assert.ok(new Date(quiz.expiresAt).getTime() > Date.now());

  for (const question of quiz.questions) {
    assert.equal(question.options.length, 4);
    assert.equal(question.correctAnswer, undefined);
    assert.equal(question.explanation, undefined);
    assert.equal(question.isCorrect, undefined);
  }

  assert.doesNotMatch(JSON.stringify(quiz), /correctAnswer|explanation/);
  assert.equal(mockState.lastRequest.model, "test-groq-model");
  assert.equal(
    mockState.lastRequest.authorization,
    "Bearer test-groq-key"
  );
  assert.equal(
    JSON.parse(
      mockState.lastRequest.body.messages[1].content
    ).learnerInstructions,
    "Focus on word problems."
  );
});

test("quiz submission validates malformed, partial, and forged answers", async () => {
  const quiz = await generateValidQuiz(ownerToken);
  const session = quizSessionStore.get(quiz.id);
  const correctAnswers = buildAnswers(session);

  const invalidBodies = [
    {},
    { answers: [] },
    {
      answers: correctAnswers.answers.slice(0, 2),
    },
    {
      answers: [
        ...correctAnswers.answers.slice(0, 2),
        {
          questionIndex: 0,
          selectedAnswer: session.questions[0].correctAnswer,
        },
      ],
    },
    {
      answers: correctAnswers.answers.map((answer, index) =>
        index === 0
          ? { ...answer, selectedAnswer: "Not an option" }
          : answer
      ),
    },
    {
      ...correctAnswers,
      scorePercentage: 100,
    },
    {
      answers: correctAnswers.answers.map((answer) => ({
        ...answer,
        isCorrect: true,
      })),
    },
  ];

  for (const body of invalidBodies) {
    const response = await apiRequest(
      `/api/quizzes/${quiz.id}/submit`,
      {
        method: "POST",
        token: ownerToken,
        body,
      }
    );

    assert.equal(response.status, 400, JSON.stringify(body));
  }

  assert.equal(
    await QuizAttempt.countDocuments({
      owner: owner._id,
      quizSessionId: quiz.id,
    }),
    0
  );
});

test("quiz submission grades on the server and persists one attempt", async () => {
  const quiz = await generateValidQuiz(ownerToken, {
    subjectId: ownerSubject.id,
    difficulty: "easy",
  });
  const session = quizSessionStore.get(quiz.id);
  const answers = buildAnswers(session, { wrongIndex: 1 });

  const response = await apiRequest(
    `/api/quizzes/${quiz.id}/submit`,
    {
      method: "POST",
      token: ownerToken,
      body: answers,
    }
  );

  assert.equal(response.status, 201, response.text);
  const { attempt } = response.body;

  assert.equal(attempt.scorePercentage, 67);
  assert.equal(attempt.correctAnswers, 2);
  assert.equal(attempt.totalQuestions, 3);
  assert.equal(attempt.difficulty, "easy");
  assert.equal(attempt.subject.id, ownerSubject.id);
  assert.equal(attempt.questions.length, 3);
  assert.equal(attempt.questions[1].isCorrect, false);
  assert.equal(
    attempt.questions[1].correctAnswer,
    session.questions[1].correctAnswer
  );
  assert.ok(attempt.questions[0].explanation);

  const savedAttempt = await QuizAttempt.findOne({
    owner: owner._id,
    quizSessionId: quiz.id,
  });

  assert.ok(savedAttempt);
  assert.equal(savedAttempt.owner.toString(), owner._id.toString());
  assert.equal(savedAttempt.subject.toString(), ownerSubject.id);
  assert.equal(savedAttempt.scorePercentage, 67);
  assert.equal(savedAttempt.correctAnswers, 2);
  assert.equal(savedAttempt.questions.length, 3);
  assert.ok(savedAttempt.timeTakenSeconds >= 0);
  assert.equal(savedAttempt.quizTitle, "Algebra basics · Easy quiz");
});

test("quiz submission prevents duplicate and cross-user access", async () => {
  const quiz = await generateValidQuiz(ownerToken);
  const session = quizSessionStore.get(quiz.id);
  const answers = buildAnswers(session);

  const otherResponse = await apiRequest(
    `/api/quizzes/${quiz.id}/submit`,
    {
      method: "POST",
      token: otherOwnerToken,
      body: answers,
    }
  );

  assert.equal(otherResponse.status, 404);
  assert.equal(otherResponse.body.reason, "quiz_session_missing");

  const firstResponse = await apiRequest(
    `/api/quizzes/${quiz.id}/submit`,
    {
      method: "POST",
      token: ownerToken,
      body: answers,
    }
  );
  const duplicateResponse = await apiRequest(
    `/api/quizzes/${quiz.id}/submit`,
    {
      method: "POST",
      token: ownerToken,
      body: answers,
    }
  );

  assert.equal(firstResponse.status, 201);
  assert.equal(duplicateResponse.status, 409);
  assert.equal(
    duplicateResponse.body.reason,
    "quiz_already_submitted"
  );
  assert.equal(
    await QuizAttempt.countDocuments({
      owner: owner._id,
      quizSessionId: quiz.id,
    }),
    1
  );
});

test("concurrent quiz submissions create only one attempt", async () => {
  const quiz = await generateValidQuiz(ownerToken);
  const session = quizSessionStore.get(quiz.id);
  const answers = buildAnswers(session);
  const submit = () =>
    apiRequest(`/api/quizzes/${quiz.id}/submit`, {
      method: "POST",
      token: ownerToken,
      body: answers,
    });

  const responses = await Promise.all([submit(), submit()]);
  const statuses = responses.map((response) => response.status).sort();

  assert.deepEqual(statuses, [201, 409]);
  assert.equal(
    await QuizAttempt.countDocuments({
      owner: owner._id,
      quizSessionId: quiz.id,
    }),
    1
  );
});

test("quiz submission handles missing, expired, and invalid sessions", async () => {
  const invalidIdResponse = await apiRequest(
    "/api/quizzes/not-a-quiz/submit",
    {
      method: "POST",
      token: ownerToken,
      body: { answers: [] },
    }
  );

  assert.equal(invalidIdResponse.status, 400);

  const missingResponse = await apiRequest(
    "/api/quizzes/00000000-0000-4000-8000-000000000000/submit",
    {
      method: "POST",
      token: ownerToken,
      body: { answers: [] },
    }
  );

  assert.equal(missingResponse.status, 404);

  const quiz = await generateValidQuiz(ownerToken);
  const session = quizSessionStore.get(quiz.id);
  const answers = buildAnswers(session);
  session.expiresAt = Date.now() - 1;

  const expiredResponse = await apiRequest(
    `/api/quizzes/${quiz.id}/submit`,
    {
      method: "POST",
      token: ownerToken,
      body: answers,
    }
  );

  assert.equal(expiredResponse.status, 404);
  assert.equal(expiredResponse.body.reason, "quiz_session_missing");
});

test("quiz history is owner-scoped, ordered, paginated, and hides answers", async () => {
  const baseTime = Date.now() - 60000;
  const historyAttempts = [];

  for (let index = 0; index < 5; index += 1) {
    historyAttempts.push(
      await QuizAttempt.create({
        owner: historyOwner._id,
        quizTitle: `History quiz ${index}`,
        topic: `History topic ${index}`,
        difficulty: index % 2 === 0 ? "easy" : "medium",
        quizSessionId: `history-${runId}-${index}`,
        totalQuestions: 4,
        correctAnswers: index,
        scorePercentage: index * 25,
        completedAt: new Date(baseTime + index * 1000),
      })
    );
  }

  await QuizAttempt.create({
    owner: otherOwner._id,
    quizTitle: "Not visible",
    quizSessionId: `history-other-${runId}`,
    totalQuestions: 1,
    correctAnswers: 0,
    scorePercentage: 0,
  });

  const firstPage = await apiRequest(
    "/api/quizzes/history?page=1&limit=2",
    { token: historyOwnerToken }
  );

  assert.equal(firstPage.status, 200);
  assert.equal(firstPage.body.pagination.page, 1);
  assert.equal(firstPage.body.pagination.limit, 2);
  assert.equal(firstPage.body.pagination.total, 5);
  assert.equal(firstPage.body.pagination.totalPages, 3);
  assert.equal(firstPage.body.attempts.length, 2);
  assert.equal(firstPage.body.attempts[0].id, String(historyAttempts[4]._id));
  assert.equal(firstPage.body.attempts[1].id, String(historyAttempts[3]._id));
  assert.equal(firstPage.body.attempts[0].questions, undefined);
  assert.equal(firstPage.body.attempts[0].correctAnswer, undefined);
  assert.ok(
    firstPage.body.attempts.every(
      (attempt) => attempt.title !== "Not visible"
    )
  );

  const lastPage = await apiRequest(
    "/api/quizzes/history?page=3&limit=2",
    { token: historyOwnerToken }
  );

  assert.equal(lastPage.status, 200);
  assert.equal(lastPage.body.attempts.length, 1);
  assert.equal(lastPage.body.attempts[0].id, String(historyAttempts[0]._id));

  const otherHistory = await apiRequest("/api/quizzes/history", {
    token: otherOwnerToken,
  });

  assert.equal(otherHistory.status, 200);
  assert.equal(otherHistory.body.pagination.total, 1);
  assert.equal(otherHistory.body.attempts[0].title, "Not visible");
});

test("quiz history rejects invalid pagination", async () => {
  for (const query of [
    "page=0",
    "page=abc",
    "limit=0",
    "limit=51",
    "limit=1.5",
  ]) {
    const response = await apiRequest(
      `/api/quizzes/history?${query}`,
      { token: historyOwnerToken }
    );

    assert.equal(response.status, 400, query);
  }
});

test("quiz sessions expire, enforce ownership, and prevent duplicate starts", () => {
  let currentTime = 1000;
  const store = new QuizSessionStore({
    ttlMs: 10,
    cleanupIntervalMs: 60000,
    now: () => currentTime,
  });

  try {
    const session = store.create({ ownerId: "owner-1" });

    assert.equal(store.get(session.id).id, session.id);
    assert.equal(store.getForOwner(session.id, "owner-2"), null);
    assert.deepEqual(store.beginSubmission(session.id, "owner-2"), {
      status: "missing",
    });

    const firstStart = store.beginSubmission(session.id, "owner-1");
    assert.equal(firstStart.status, "ready");
    assert.deepEqual(store.beginSubmission(session.id, "owner-1"), {
      status: "duplicate",
    });

    store.releaseSubmission(session.id);
    assert.equal(
      store.beginSubmission(session.id, "owner-1").status,
      "ready"
    );

    currentTime = 1011;
    assert.equal(store.get(session.id), null);
  } finally {
    store.clear();
    clearInterval(store.cleanupTimer);
  }
});

test("quiz generation rate limiting is scoped to each user", () => {
  let currentTime = 0;
  const limiter = createQuizRateLimiter({
    limit: 2,
    windowMs: 100,
    now: () => currentTime,
  });

  function run(userId) {
    const response = {
      statusCode: 200,
      headers: {},
      body: null,
      set(name, value) {
        this.headers[name] = value;
        return this;
      },
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(body) {
        this.body = body;
        return this;
      },
    };
    let passed = false;

    limiter(
      { user: { id: userId }, ip: "127.0.0.1" },
      response,
      () => {
        passed = true;
      }
    );

    return { passed, response };
  }

  assert.equal(run("user-a").passed, true);
  assert.equal(run("user-a").passed, true);

  const limited = run("user-a");
  assert.equal(limited.passed, false);
  assert.equal(limited.response.statusCode, 429);
  assert.equal(limited.response.body.reason, "generation_rate_limited");
  assert.ok(Number(limited.response.headers["Retry-After"]) >= 1);

  assert.equal(run("user-b").passed, true);

  currentTime = 101;
  assert.equal(run("user-a").passed, true);
});
