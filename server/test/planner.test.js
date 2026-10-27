import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { after, before, test } from "node:test";
import mongoose from "mongoose";

const runId = randomBytes(6).toString("hex");
const allowedOrigin = "http://localhost:5173";
const testMongoUri =
  process.env.MONGODB_TEST_URI ||
  "mongodb://127.0.0.1:27017/preppilot_ai_planner_test";

process.env.NODE_ENV = "test";
process.env.CLIENT_URL = allowedOrigin;
process.env.JWT_SECRET = randomBytes(48).toString("hex");

let app;
let User;
let Subject;
let StudyPlan;
let QuizAttempt;
let RevisionItem;
let signAccessToken;
let server;
let baseUrl;
let owner;
let otherOwner;
let ownerToken;
let otherOwnerToken;
const createdUserIds = [];

function makeEmail(label) {
  return `planner-test-${runId}-${label}@example.com`;
}

function futureDate(days) {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
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

async function createSubject(token, overrides = {}) {
  const response = await apiRequest("/api/subjects", {
    method: "POST",
    token,
    body: {
      name: "Planner Subject",
      description: "Planner test subject",
      color: "#38bdf8",
      ...overrides,
    },
  });

  assert.equal(response.status, 201);
  return response.body.subject;
}

function planBody(overrides = {}) {
  return {
    title: "Planner Test Plan",
    description: "A test study plan",
    examDate: futureDate(7),
    dailyStudyHours: 2,
    status: "active",
    topics: [
      { title: "Topic One", estimatedMinutes: 45 },
      { title: "Topic Two", estimatedMinutes: 30 },
    ],
    ...overrides,
  };
}

async function createPlan(token, overrides = {}) {
  const response = await apiRequest("/api/study-plans", {
    method: "POST",
    token,
    body: planBody(overrides),
  });

  assert.equal(response.status, 201);
  return response.body.plan;
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

  ({ default: app } = await import("../src/app.js"));
  ({ default: User } = await import("../src/models/User.js"));
  ({ default: Subject } = await import("../src/models/Subject.js"));
  ({ default: StudyPlan } = await import("../src/models/StudyPlan.js"));
  ({ default: QuizAttempt } = await import("../src/models/QuizAttempt.js"));
  ({ default: RevisionItem } = await import("../src/models/RevisionItem.js"));
  ({ signAccessToken } = await import("../src/utils/tokens.js"));

  await Promise.all([
    User.init(),
    Subject.init(),
    StudyPlan.init(),
    QuizAttempt.init(),
    RevisionItem.init(),
  ]);

  owner = await User.create({
    name: "Planner Owner",
    email: makeEmail("owner"),
    password: "test-password",
  });
  otherOwner = await User.create({
    name: "Planner Other",
    email: makeEmail("other"),
    password: "test-password",
  });
  createdUserIds.push(owner._id, otherOwner._id);
  ownerToken = signAccessToken(owner._id);
  otherOwnerToken = signAccessToken(otherOwner._id);

  await new Promise((resolve, reject) => {
    server = app.listen(0, "127.0.0.1", resolve);
    server.once("error", reject);
  });

  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  const owned = { owner: { $in: createdUserIds } };

  if (StudyPlan) {
    await StudyPlan.deleteMany(owned);
  }
  if (Subject) {
    await Subject.deleteMany(owned);
  }
  if (QuizAttempt) {
    await QuizAttempt.deleteMany(owned);
  }
  if (RevisionItem) {
    await RevisionItem.deleteMany(owned);
  }
  if (User) {
    await User.deleteMany({ _id: { $in: createdUserIds } });
  }

  if (server) {
    await new Promise((resolve) => {
      server.close(resolve);
      server.closeAllConnections?.();
    });
  }

  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
});

test("planner routes require authentication", async () => {
  const subjects = await apiRequest("/api/subjects");
  const plans = await apiRequest("/api/study-plans");

  assert.equal(subjects.status, 401);
  assert.equal(plans.status, 401);
  assert.equal(subjects.body.success, false);
  assert.equal(plans.body.success, false);
});

test("subject CRUD stays isolated to the authenticated owner", async () => {
  const createResponse = await apiRequest("/api/subjects", {
    method: "POST",
    token: ownerToken,
    body: {
      name: "  Physics  ",
      description: "  Mechanics and waves  ",
      color: "#22d3ee",
      owner: otherOwner._id,
    },
  });

  assert.equal(createResponse.status, 201);
  assert.equal(createResponse.body.subject.name, "Physics");
  assert.equal(createResponse.body.subject.description, "Mechanics and waves");
  assert.equal(createResponse.body.subject.owner, undefined);

  const subjectId = createResponse.body.subject.id;
  const storedSubject = await Subject.findById(subjectId).lean();
  assert.equal(String(storedSubject.owner), String(owner._id));

  const ownerList = await apiRequest("/api/subjects", { token: ownerToken });
  const otherList = await apiRequest("/api/subjects", {
    token: otherOwnerToken,
  });

  assert.equal(ownerList.status, 200);
  assert.ok(ownerList.body.subjects.some((subject) => subject.id === subjectId));
  assert.equal(otherList.status, 200);
  assert.equal(
    otherList.body.subjects.some((subject) => subject.id === subjectId),
    false
  );

  const forbiddenUpdate = await apiRequest(`/api/subjects/${subjectId}`, {
    method: "PUT",
    token: otherOwnerToken,
    body: { name: "Stolen" },
  });
  const forbiddenDelete = await apiRequest(`/api/subjects/${subjectId}`, {
    method: "DELETE",
    token: otherOwnerToken,
  });

  assert.equal(forbiddenUpdate.status, 404);
  assert.equal(forbiddenDelete.status, 404);

  const updateResponse = await apiRequest(`/api/subjects/${subjectId}`, {
    method: "PUT",
    token: ownerToken,
    body: { name: "  Physics II  ", color: "#a78bfa" },
  });

  assert.equal(updateResponse.status, 200);
  assert.equal(updateResponse.body.subject.name, "Physics II");
  assert.equal(updateResponse.body.subject.color, "#a78bfa");

  const deleteResponse = await apiRequest(`/api/subjects/${subjectId}`, {
    method: "DELETE",
    token: ownerToken,
  });

  assert.equal(deleteResponse.status, 204);
  assert.equal(deleteResponse.text, "");
  assert.equal(await Subject.exists({ _id: subjectId }), null);
});

test("subject validation rejects malformed and empty input", async () => {
  const cases = [
    {},
    { name: "   " },
    { name: "x".repeat(121) },
    { name: "Valid", description: 42 },
    { name: "Valid", color: 42 },
  ];

  for (const body of cases) {
    const response = await apiRequest("/api/subjects", {
      method: "POST",
      token: ownerToken,
      body,
    });

    assert.equal(response.status, 400);
    assert.equal(response.body.success, false);
  }

  const subject = await createSubject(ownerToken, { name: "Validation Subject" });
  const emptyUpdate = await apiRequest(`/api/subjects/${subject.id}`, {
    method: "PUT",
    token: ownerToken,
    body: {},
  });
  const invalidIdUpdate = await apiRequest("/api/subjects/not-an-id", {
    method: "PUT",
    token: ownerToken,
    body: { name: "Nope" },
  });
  const invalidIdDelete = await apiRequest("/api/subjects/not-an-id", {
    method: "DELETE",
    token: ownerToken,
  });

  assert.equal(emptyUpdate.status, 400);
  assert.equal(invalidIdUpdate.status, 404);
  assert.equal(invalidIdDelete.status, 404);

  await apiRequest(`/api/subjects/${subject.id}`, {
    method: "DELETE",
    token: ownerToken,
  });
});

test("study plan CRUD, ownership, and topic completion work together", async () => {
  const subject = await createSubject(ownerToken, { name: "Chemistry" });
  const plan = await createPlan(ownerToken, {
    title: "  Chemistry Review  ",
    description: "  Focus on organic chemistry  ",
    subject: subject.id,
    topics: [
      { title: "  Alkanes  ", estimatedMinutes: 45 },
      { title: "Alkenes", estimatedMinutes: 30 },
    ],
  });

  assert.equal(plan.title, "Chemistry Review");
  assert.equal(plan.description, "Focus on organic chemistry");
  assert.equal(plan.subject.id, subject.id);
  assert.equal(plan.subject.name, "Chemistry");
  assert.equal(plan.topics.length, 2);
  assert.equal(plan.topics[0].title, "Alkanes");
  assert.notEqual(plan.topics[0].id, plan.topics[1].id);
  assert.deepEqual(
    plan.topics.map((topic) => topic.order),
    [0, 1]
  );
  assert.deepEqual(plan.schedule, []);
  assert.equal(plan.owner, undefined);

  const listResponse = await apiRequest("/api/study-plans", {
    token: ownerToken,
  });
  const otherList = await apiRequest("/api/study-plans", {
    token: otherOwnerToken,
  });

  assert.equal(listResponse.status, 200);
  assert.ok(listResponse.body.plans.some((item) => item.id === plan.id));
  assert.equal(
    otherList.body.plans.some((item) => item.id === plan.id),
    false
  );

  const forbiddenUpdate = await apiRequest(`/api/study-plans/${plan.id}`, {
    method: "PUT",
    token: otherOwnerToken,
    body: { title: "Stolen plan" },
  });
  const forbiddenDelete = await apiRequest(`/api/study-plans/${plan.id}`, {
    method: "DELETE",
    token: otherOwnerToken,
  });

  assert.equal(forbiddenUpdate.status, 404);
  assert.equal(forbiddenDelete.status, 404);

  const updateResponse = await apiRequest(`/api/study-plans/${plan.id}`, {
    method: "PUT",
    token: ownerToken,
    body: { title: "Chemistry Review Updated" },
  });

  assert.equal(updateResponse.status, 200);
  assert.equal(updateResponse.body.plan.title, "Chemistry Review Updated");
  assert.deepEqual(
    updateResponse.body.plan.topics.map((topic) => topic.id),
    plan.topics.map((topic) => topic.id)
  );

  const topicResponse = await apiRequest(
    `/api/study-plans/${plan.id}/topics/${plan.topics[0].id}`,
    {
      method: "PATCH",
      token: ownerToken,
      body: { completed: true },
    }
  );

  assert.equal(topicResponse.status, 200);
  assert.equal(topicResponse.body.plan.topics[0].completed, true);
  assert.deepEqual(topicResponse.body.plan.progress, {
    totalTopics: 2,
    completedTopics: 1,
    completionPercentage: 50,
  });

  const extraTopicField = await apiRequest(
    `/api/study-plans/${plan.id}/topics/${plan.topics[1].id}`,
    {
      method: "PATCH",
      token: ownerToken,
      body: { completed: true, title: "Changed" },
    }
  );
  const missingTopic = await apiRequest(
    `/api/study-plans/${plan.id}/topics/${new mongoose.Types.ObjectId()}`,
    {
      method: "PATCH",
      token: ownerToken,
      body: { completed: true },
    }
  );

  assert.equal(extraTopicField.status, 400);
  assert.equal(missingTopic.status, 404);

  const deleteResponse = await apiRequest(`/api/study-plans/${plan.id}`, {
    method: "DELETE",
    token: ownerToken,
  });

  assert.equal(deleteResponse.status, 204);
  assert.equal(await StudyPlan.exists({ _id: plan.id }), null);

  await apiRequest(`/api/subjects/${subject.id}`, {
    method: "DELETE",
    token: ownerToken,
  });
});

test("study plan validation rejects invalid fields and foreign subjects", async () => {
  const foreignSubject = await createSubject(otherOwnerToken, {
    name: "Foreign Subject",
  });
  const countBefore = await StudyPlan.countDocuments({ owner: owner._id });
  const validTopics = [{ title: "Valid topic", estimatedMinutes: 30 }];
  const cases = [
    { body: { title: "" } },
    { body: { title: "No hours", dailyStudyHours: 0 } },
    { body: { title: "Too many hours", dailyStudyHours: 25 } },
    { body: { title: "Bad status", status: "archived" } },
    { body: { title: "Bad subject", subject: "not-an-object-id" } },
    {
      body: { title: "Foreign subject", subject: foreignSubject.id },
      status: 404,
    },
    {
      body: {
        title: "Bad estimate",
        topics: [{ title: "Topic", estimatedMinutes: 0 }],
      },
    },
    {
      body: {
        title: "Bad completed",
        topics: [{ title: "Topic", completed: "yes" }],
      },
    },
    {
      body: {
        title: "Unknown topic id",
        topics: [
          {
            id: new mongoose.Types.ObjectId().toString(),
            title: "Topic",
            estimatedMinutes: 30,
          },
        ],
      },
    },
    {
      body: {
        title: "Bad exam date",
        examDate: "2026-02-31",
        topics: validTopics,
      },
    },
  ];

  for (const testCase of cases) {
    const response = await apiRequest("/api/study-plans", {
      method: "POST",
      token: ownerToken,
      body: planBody(testCase.body),
    });

    assert.equal(
      response.status,
      testCase.status || 400,
      JSON.stringify(testCase.body)
    );
    assert.equal(response.body.success, false);
  }

  assert.equal(
    await StudyPlan.countDocuments({ owner: owner._id }),
    countBefore
  );

  await apiRequest(`/api/subjects/${foreignSubject.id}`, {
    method: "DELETE",
    token: otherOwnerToken,
  });
});

test("schedule generation is deterministic, bounded, and duplicate-safe", async () => {
  const subject = await createSubject(ownerToken, { name: "Generated Subject" });
  const payload = planBody({
    title: `Generated Plan ${runId}`,
    subject: subject.id,
    examDate: futureDate(2),
    dailyStudyHours: 2,
    topics: [
      { title: "Topic A", estimatedMinutes: 90 },
      { title: "Topic B", estimatedMinutes: 30 },
      { title: "Topic C", estimatedMinutes: 60 },
    ],
  });
  const response = await apiRequest("/api/study-plans/generate", {
    method: "POST",
    token: ownerToken,
    body: payload,
  });

  assert.equal(response.status, 201);
  assert.equal(response.body.plan.schedule.length, 2);
  assert.deepEqual(
    response.body.plan.schedule.map((day) => day.totalMinutes),
    [120, 60]
  );
  assert.deepEqual(
    response.body.plan.schedule.flatMap((day) =>
      day.topics.map((entry) => entry.minutes)
    ),
    [90, 30, 60]
  );

  const examTime = Date.parse(`${futureDate(2)}T00:00:00.000Z`);
  for (const day of response.body.plan.schedule) {
    assert.ok(Date.parse(day.date) <= examTime);
  }

  const topicIds = response.body.plan.topics.map((topic) => topic.id);
  for (const entry of response.body.plan.schedule.flatMap((day) => day.topics)) {
    assert.ok(topicIds.includes(entry.topicId));
  }

  const duplicateResponse = await apiRequest("/api/study-plans/generate", {
    method: "POST",
    token: ownerToken,
    body: payload,
  });

  assert.equal(duplicateResponse.status, 200);
  assert.equal(duplicateResponse.body.duplicate, true);
  assert.equal(
    duplicateResponse.body.plan.id,
    response.body.plan.id
  );
  assert.equal(
    await StudyPlan.countDocuments({
      owner: owner._id,
      title: payload.title,
    }),
    1
  );

  await apiRequest(`/api/study-plans/${response.body.plan.id}`, {
    method: "DELETE",
    token: ownerToken,
  });
  await apiRequest(`/api/subjects/${subject.id}`, {
    method: "DELETE",
    token: ownerToken,
  });
});

test("infeasible schedules return useful errors without saving plans", async () => {
  const countBefore = await StudyPlan.countDocuments({
    owner: owner._id,
  });
  const insufficient = await apiRequest("/api/study-plans/generate", {
    method: "POST",
    token: ownerToken,
    body: planBody({
      title: `Impossible Plan ${runId}`,
      examDate: futureDate(1),
      dailyStudyHours: 1,
      topics: [
        { title: "Long A", estimatedMinutes: 120 },
        { title: "Long B", estimatedMinutes: 120 },
      ],
    }),
  });

  assert.equal(insufficient.status, 422);
  assert.equal(insufficient.body.reason, "insufficient_time");
  assert.equal(insufficient.body.feasibility.totalStudyMinutes, 240);
  assert.equal(insufficient.body.feasibility.availableMinutes, 120);

  const pastExam = await apiRequest("/api/study-plans/generate", {
    method: "POST",
    token: ownerToken,
    body: planBody({
      title: `Past Plan ${runId}`,
      examDate: futureDate(-2),
    }),
  });
  const noTopics = await apiRequest("/api/study-plans/generate", {
    method: "POST",
    token: ownerToken,
    body: planBody({
      title: `Empty Plan ${runId}`,
      topics: [],
    }),
  });
  const noExam = await apiRequest("/api/study-plans/generate", {
    method: "POST",
    token: ownerToken,
    body: planBody({
      title: `No Exam Plan ${runId}`,
      examDate: null,
    }),
  });

  assert.equal(pastExam.status, 400);
  assert.equal(pastExam.body.reason, "exam_date_past");
  assert.equal(noTopics.status, 400);
  assert.equal(noTopics.body.reason, "no_topics");
  assert.equal(noExam.status, 400);
  assert.equal(noExam.body.reason, "exam_date_required");
  assert.equal(
    await StudyPlan.countDocuments({ owner: owner._id }),
    countBefore
  );
});

test("existing plans generate schedules and block unsafe subject deletion", async () => {
  const subject = await createSubject(ownerToken, { name: "Protected Subject" });
  const plan = await createPlan(ownerToken, {
    title: `Existing Plan ${runId}`,
    subject: subject.id,
    examDate: futureDate(3),
    dailyStudyHours: 1,
    topics: [
      { title: "Existing A", estimatedMinutes: 45 },
      { title: "Existing B", estimatedMinutes: 30 },
    ],
  });

  assert.deepEqual(plan.schedule, []);

  const generateResponse = await apiRequest(
    `/api/study-plans/${plan.id}/generate`,
    {
      method: "POST",
      token: ownerToken,
    }
  );

  assert.equal(generateResponse.status, 200);
  assert.equal(generateResponse.body.plan.schedule.length, 2);

  const blockedDelete = await apiRequest(`/api/subjects/${subject.id}`, {
    method: "DELETE",
    token: ownerToken,
  });

  assert.equal(blockedDelete.status, 409);
  assert.match(blockedDelete.body.message, /still used/i);

  await apiRequest(`/api/study-plans/${plan.id}`, {
    method: "DELETE",
    token: ownerToken,
  });

  const quizAttempt = await QuizAttempt.create({
    owner: owner._id,
    subject: subject.id,
    quizTitle: "Subject reference check",
    totalQuestions: 1,
    correctAnswers: 1,
    scorePercentage: 100,
  });
  const quizBlockedDelete = await apiRequest(
    `/api/subjects/${subject.id}`,
    {
      method: "DELETE",
      token: ownerToken,
    }
  );

  assert.equal(quizBlockedDelete.status, 409);
  await quizAttempt.deleteOne();

  const deleteResponse = await apiRequest(`/api/subjects/${subject.id}`, {
    method: "DELETE",
    token: ownerToken,
  });

  assert.equal(deleteResponse.status, 204);
});
