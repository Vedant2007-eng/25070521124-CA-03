import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { after, before, test } from "node:test";
import mongoose from "mongoose";

const runId = randomBytes(6).toString("hex");
const allowedOrigin = "http://localhost:5173";
const testMongoUri =
  process.env.MONGODB_TEST_URI ||
  "mongodb://127.0.0.1:27017/preppilot_ai_analytics_test";
const MS_PER_DAY = 24 * 60 * 60 * 1000;

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
let scheduler;
let server;
let baseUrl;
let owner;
let otherOwner;
let emptyOwner;
let ownerToken;
let otherOwnerToken;
let emptyOwnerToken;
let physics;
let math;
let otherSubject;
let orphanSubjectId;
let quizSessionCounter = 0;
const createdUserIds = [];

function makeEmail(label) {
  return `analytics-test-${runId}-${label}@example.com`;
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

async function addPlan({
  ownerId,
  title,
  subject,
  status = "active",
  topics,
  examDate,
  createdAt,
  updatedAt,
}) {
  const plan = await StudyPlan.create({
    owner: ownerId,
    title,
    subject,
    dailyStudyHours: 2,
    status,
    topics,
    examDate,
    generationKey: `analytics-${runId}-${title}-${randomBytes(3).toString("hex")}`,
  });

  if (createdAt || updatedAt) {
    await StudyPlan.collection.updateOne(
      { _id: plan._id },
      {
        $set: {
          createdAt: createdAt || updatedAt,
          updatedAt: updatedAt || createdAt,
        },
      }
    );
  }

  return plan;
}

async function addAttempt({
  ownerId,
  subject,
  topic,
  score,
  correctAnswers,
  totalQuestions,
  completedAt,
}) {
  quizSessionCounter += 1;

  return QuizAttempt.create({
    owner: ownerId,
    subject,
    topic,
    quizTitle: `${topic} quiz`,
    difficulty: "medium",
    quizSessionId: `analytics-${runId}-${quizSessionCounter}`,
    questions: [],
    totalQuestions,
    correctAnswers,
    scorePercentage: score,
    timeTakenSeconds: 60,
    completedAt,
  });
}

async function addRevision({
  ownerId,
  subject,
  topic,
  priority = "medium",
  status = "pending",
  nextReviewAt,
  lastReviewedAt,
  reviewCount = 0,
  createdAt,
  updatedAt,
}) {
  const item = await RevisionItem.create({
    owner: ownerId,
    subject,
    topic,
    priority,
    status,
    nextReviewAt,
    lastReviewedAt,
    reviewCount,
  });

  if (createdAt || updatedAt) {
    await RevisionItem.collection.updateOne(
      { _id: item._id },
      {
        $set: {
          createdAt: createdAt || updatedAt,
          updatedAt: updatedAt || createdAt,
        },
      }
    );
  }

  return item;
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
  ({ default: RevisionItem } = await import(
    "../src/models/RevisionItem.js"
  ));
  ({ signAccessToken } = await import("../src/utils/tokens.js"));
  scheduler = await import("../src/services/revisionScheduler.js");

  await Promise.all([
    User.init(),
    Subject.init(),
    StudyPlan.init(),
    QuizAttempt.init(),
    RevisionItem.init(),
  ]);

  owner = await User.create({
    name: "Analytics Owner",
    email: makeEmail("owner"),
    password: "test-password",
    examTarget: "Engineering entrance",
  });
  otherOwner = await User.create({
    name: "Analytics Other",
    email: makeEmail("other"),
    password: "test-password",
  });
  emptyOwner = await User.create({
    name: "Analytics Empty",
    email: makeEmail("empty"),
    password: "test-password",
  });
  createdUserIds.push(owner._id, otherOwner._id, emptyOwner._id);
  ownerToken = signAccessToken(owner._id);
  otherOwnerToken = signAccessToken(otherOwner._id);
  emptyOwnerToken = signAccessToken(emptyOwner._id);

  physics = await Subject.create({
    owner: owner._id,
    name: "Physics",
    color: "#38bdf8",
  });
  math = await Subject.create({
    owner: owner._id,
    name: "Mathematics",
    color: "#a78bfa",
  });
  otherSubject = await Subject.create({
    owner: otherOwner._id,
    name: "Other Subject",
    color: "#f97316",
  });
  orphanSubjectId = new mongoose.Types.ObjectId();

  const now = new Date();
  const todayStart = scheduler.startOfUtcDay(now);
  const tomorrowStart = scheduler.startOfNextUtcDay(now);
  const atOffset = (milliseconds) =>
    new Date(now.getTime() + milliseconds);

  await addPlan({
    ownerId: owner._id,
    title: "Physics plan",
    subject: physics._id,
    status: "active",
    examDate: atOffset(2 * MS_PER_DAY),
    createdAt: atOffset(-30 * MS_PER_DAY),
    updatedAt: atOffset(-3 * 60 * 60 * 1000),
    topics: [
      { title: "Mechanics", completed: true, estimatedMinutes: 60 },
      { title: "Waves", completed: true, estimatedMinutes: 30 },
      { title: "Optics", completed: false, estimatedMinutes: 90 },
    ],
  });
  await addPlan({
    ownerId: owner._id,
    title: "Math plan",
    subject: math._id,
    status: "paused",
    examDate: atOffset(5 * MS_PER_DAY),
    createdAt: atOffset(-25 * MS_PER_DAY),
    updatedAt: atOffset(-6 * 60 * 60 * 1000),
    topics: [
      { title: "Algebra", completed: false, estimatedMinutes: 60 },
    ],
  });
  await addPlan({
    ownerId: owner._id,
    title: "Completed physics plan",
    subject: physics._id,
    status: "completed",
    createdAt: atOffset(-20 * MS_PER_DAY),
    updatedAt: atOffset(-9 * 60 * 60 * 1000),
    topics: [
      { title: "Circuits", completed: true, estimatedMinutes: 30 },
    ],
  });
  await addPlan({
    ownerId: otherOwner._id,
    title: "Other plan",
    subject: otherSubject._id,
    status: "active",
    examDate: atOffset(4 * MS_PER_DAY),
    createdAt: atOffset(-2 * MS_PER_DAY),
    updatedAt: atOffset(-2 * MS_PER_DAY),
    topics: [
      { title: "Other topic one", completed: true, estimatedMinutes: 40 },
      { title: "Other topic two", completed: false, estimatedMinutes: 20 },
    ],
  });

  await addAttempt({
    ownerId: owner._id,
    subject: orphanSubjectId,
    topic: "Orphan",
    score: 80,
    correctAnswers: 4,
    totalQuestions: 5,
    completedAt: atOffset(-5 * MS_PER_DAY),
  });
  await addAttempt({
    ownerId: owner._id,
    subject: physics._id,
    topic: "Mechanics",
    score: 60,
    correctAnswers: 3,
    totalQuestions: 5,
    completedAt: atOffset(-3 * MS_PER_DAY),
  });
  await addAttempt({
    ownerId: owner._id,
    subject: physics._id,
    topic: "Mechanics",
    score: 100,
    correctAnswers: 4,
    totalQuestions: 4,
    completedAt: atOffset(-2 * MS_PER_DAY),
  });
  await addAttempt({
    ownerId: owner._id,
    subject: math._id,
    topic: "Algebra",
    score: 80,
    correctAnswers: 4,
    totalQuestions: 5,
    completedAt: atOffset(-1 * MS_PER_DAY),
  });
  await addAttempt({
    ownerId: owner._id,
    subject: null,
    topic: "General",
    score: 40,
    correctAnswers: 2,
    totalQuestions: 5,
    completedAt: atOffset(-4 * 60 * 60 * 1000),
  });
  await addAttempt({
    ownerId: owner._id,
    subject: physics._id,
    topic: "Mechanics",
    score: 100,
    correctAnswers: 4,
    totalQuestions: 4,
    completedAt: atOffset(2 * MS_PER_DAY),
  });
  await addAttempt({
    ownerId: otherOwner._id,
    subject: otherSubject._id,
    topic: "Other topic one",
    score: 100,
    correctAnswers: 2,
    totalQuestions: 2,
    completedAt: atOffset(-1 * 60 * 60 * 1000),
  });

  await addRevision({
    ownerId: owner._id,
    subject: physics._id,
    topic: "Overdue optics",
    priority: "high",
    status: "pending",
    nextReviewAt: new Date(todayStart.getTime() - 60 * 60 * 1000),
    createdAt: atOffset(-7 * MS_PER_DAY),
    updatedAt: atOffset(-7 * MS_PER_DAY),
  });
  await addRevision({
    ownerId: owner._id,
    subject: math._id,
    topic: "Due algebra",
    priority: "medium",
    status: "pending",
    nextReviewAt: todayStart,
    createdAt: atOffset(-6 * MS_PER_DAY),
    updatedAt: atOffset(-6 * MS_PER_DAY),
  });
  await addRevision({
    ownerId: owner._id,
    subject: physics._id,
    topic: "Upcoming waves",
    priority: "low",
    status: "in_progress",
    nextReviewAt: tomorrowStart,
    lastReviewedAt: atOffset(-30 * 60 * 1000),
    reviewCount: 1,
    createdAt: atOffset(-8 * MS_PER_DAY),
    updatedAt: atOffset(-30 * 60 * 1000),
  });
  await addRevision({
    ownerId: owner._id,
    subject: physics._id,
    topic: "Completed circuits",
    priority: "medium",
    status: "completed",
    nextReviewAt: tomorrowStart,
    lastReviewedAt: atOffset(-1 * MS_PER_DAY),
    reviewCount: 2,
    createdAt: atOffset(-10 * MS_PER_DAY),
    updatedAt: atOffset(-1 * MS_PER_DAY),
  });
  await addRevision({
    ownerId: owner._id,
    subject: null,
    topic: "Unscheduled notes",
    priority: "medium",
    status: "pending",
    createdAt: atOffset(-5 * MS_PER_DAY),
    updatedAt: atOffset(-5 * MS_PER_DAY),
  });
  await addRevision({
    ownerId: otherOwner._id,
    subject: otherSubject._id,
    topic: "Other revision",
    priority: "low",
    status: "pending",
    nextReviewAt: todayStart,
    createdAt: atOffset(-3 * MS_PER_DAY),
    updatedAt: atOffset(-3 * MS_PER_DAY),
  });

  await new Promise((resolve, reject) => {
    server = app.listen(0, "127.0.0.1", resolve);
    server.once("error", reject);
  });

  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  const owned = { owner: { $in: createdUserIds } };

  if (RevisionItem) {
    await RevisionItem.deleteMany(owned);
  }
  if (QuizAttempt) {
    await QuizAttempt.deleteMany(owned);
  }
  if (StudyPlan) {
    await StudyPlan.deleteMany(owned);
  }
  if (Subject) {
    await Subject.deleteMany(owned);
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

test("analytics routes require authentication", async () => {
  const requests = [
    "/api/analytics/overview",
    "/api/analytics/quizzes",
    "/api/analytics/subjects",
    "/api/analytics/revisions",
  ];

  for (const path of requests) {
    const response = await apiRequest(path);

    assert.equal(response.status, 401, path);
    assert.equal(response.body.success, false);
  }
});

test("an empty account returns zeroed analytics without errors", async () => {
  const response = await apiRequest("/api/analytics/overview", {
    token: emptyOwnerToken,
  });

  assert.equal(response.status, 200, response.text);
  assert.equal(response.body.success, true);
  assert.equal(response.body.meta.timezone, "UTC");
  assert.equal(response.body.studyPlans.total, 0);
  assert.equal(response.body.studyPlans.completionPercentage, 0);
  assert.equal(response.body.studyPlans.estimatedMinutes, 0);
  assert.equal(response.body.quizzes.totalAttempts, 0);
  assert.equal(response.body.quizzes.averageScore, 0);
  assert.equal(response.body.quizzes.highestScore, 0);
  assert.equal(response.body.quizzes.latestScore, null);
  assert.equal(response.body.quizzes.trend.length, 0);
  assert.equal(response.body.revisions.total, 0);
  assert.equal(response.body.revisions.completionPercentage, 0);
  assert.equal(response.body.overall.trackedRecords, 0);
  assert.deepEqual(response.body.subjectPerformance, []);
  assert.deepEqual(response.body.topicPerformance, []);
  assert.deepEqual(response.body.recentQuizzes, []);
  assert.deepEqual(response.body.recentActivity, []);
});

test("study-plan analytics include statuses, progress, and estimated time", async () => {
  const response = await apiRequest("/api/analytics/overview", {
    token: ownerToken,
  });

  assert.equal(response.status, 200, response.text);
  assert.deepEqual(
    {
      total: response.body.studyPlans.total,
      active: response.body.studyPlans.active,
      paused: response.body.studyPlans.paused,
      completed: response.body.studyPlans.completed,
      totalTopics: response.body.studyPlans.totalTopics,
      completedTopics: response.body.studyPlans.completedTopics,
      completionPercentage:
        response.body.studyPlans.completionPercentage,
      estimatedMinutes: response.body.studyPlans.estimatedMinutes,
      remainingMinutes: response.body.studyPlans.remainingMinutes,
    },
    {
      total: 3,
      active: 1,
      paused: 1,
      completed: 1,
      totalTopics: 5,
      completedTopics: 3,
      completionPercentage: 60,
      estimatedMinutes: 270,
      remainingMinutes: 150,
    }
  );
  assert.equal(response.body.studyPlans.upcoming.length, 2);
  assert.equal(response.body.studyPlans.upcoming[0].title, "Physics plan");
  assert.equal(
    response.body.studyPlans.upcoming[0].completionPercentage,
    67
  );
});

test("quiz analytics use persisted scores, exclude future attempts, and build trends", async () => {
  const response = await apiRequest("/api/analytics/overview", {
    token: ownerToken,
  });

  assert.equal(response.status, 200, response.text);
  assert.deepEqual(
    {
      totalAttempts: response.body.quizzes.totalAttempts,
      averageScore: response.body.quizzes.averageScore,
      highestScore: response.body.quizzes.highestScore,
      latestScore: response.body.quizzes.latestScore,
      correctAnswers: response.body.quizzes.correctAnswers,
      totalQuestions: response.body.quizzes.totalQuestions,
      accuracyPercentage: response.body.quizzes.accuracyPercentage,
    },
    {
      totalAttempts: 5,
      averageScore: 72,
      highestScore: 100,
      latestScore: 40,
      correctAnswers: 17,
      totalQuestions: 24,
      accuracyPercentage: 71,
    }
  );

  assert.equal(response.body.quizzes.trend.length, 5);
  assert.equal(response.body.quizzes.trend[0].scorePercentage, 80);
  assert.equal(response.body.quizzes.trend.at(-1).scorePercentage, 40);
  assert.equal(response.body.quizzes.trend.at(-1).title, "General quiz");
  assert.equal(response.body.recentQuizzes.length, 5);
  assert.equal(response.body.recentQuizzes[0].title, "General quiz");
  assert.ok(
    response.body.quizzes.trend.every(
      (attempt) =>
        new Date(attempt.completedAt).getTime() <= Date.now()
    )
  );
});

test("subject and topic performance only use valid owned references", async () => {
  const response = await apiRequest("/api/analytics/overview", {
    token: ownerToken,
  });

  assert.equal(response.status, 200, response.text);
  assert.equal(response.body.subjectPerformance.length, 2);

  const physicsPerformance = response.body.subjectPerformance.find(
    (subject) => subject.name === "Physics"
  );
  const mathPerformance = response.body.subjectPerformance.find(
    (subject) => subject.name === "Mathematics"
  );

  assert.deepEqual(physicsPerformance.plans, {
    total: 2,
    totalTopics: 4,
    completedTopics: 3,
    completionPercentage: 75,
    estimatedMinutes: 210,
    remainingMinutes: 90,
  });
  assert.deepEqual(physicsPerformance.quizzes, {
    attempts: 2,
    averageScore: 80,
    highestScore: 100,
    correctAnswers: 7,
    totalQuestions: 9,
    accuracyPercentage: 78,
  });
  assert.equal(mathPerformance.quizzes.attempts, 1);
  assert.equal(mathPerformance.quizzes.averageScore, 80);
  assert.equal(
    response.body.subjectPerformance.some(
      (subject) => subject.id === String(orphanSubjectId)
    ),
    false
  );

  assert.equal(response.body.topicPerformance.length, 1);
  assert.deepEqual(response.body.topicPerformance[0], {
    topic: "Mechanics",
    attempts: 2,
    averageScore: 80,
    highestScore: 100,
    correctAnswers: 7,
    totalQuestions: 9,
    accuracyPercentage: 78,
  });
});

test("revision analytics use UTC boundaries and do not count due today as overdue", async () => {
  const response = await apiRequest("/api/analytics/overview", {
    token: ownerToken,
  });

  assert.equal(response.status, 200, response.text);
  assert.deepEqual(
    {
      total: response.body.revisions.total,
      pending: response.body.revisions.pending,
      inProgress: response.body.revisions.inProgress,
      active: response.body.revisions.active,
      completed: response.body.revisions.completed,
      dueToday: response.body.revisions.dueToday,
      overdue: response.body.revisions.overdue,
      upcoming: response.body.revisions.upcoming,
      unscheduled: response.body.revisions.unscheduled,
      completionPercentage:
        response.body.revisions.completionPercentage,
    },
    {
      total: 5,
      pending: 3,
      inProgress: 1,
      active: 4,
      completed: 1,
      dueToday: 1,
      overdue: 1,
      upcoming: 1,
      unscheduled: 1,
      completionPercentage: 20,
    }
  );
  assert.equal(response.body.revisions.reminders.overdue.length, 1);
  assert.equal(
    response.body.revisions.reminders.overdue[0].topic,
    "Overdue optics"
  );
  assert.equal(
    response.body.revisions.reminders.dueToday[0].topic,
    "Due algebra"
  );
  assert.equal(
    response.body.revisions.reminders.upcoming[0].topic,
    "Upcoming waves"
  );

  const revisionsResponse = await apiRequest(
    "/api/analytics/revisions",
    { token: ownerToken }
  );

  assert.equal(revisionsResponse.status, 200, revisionsResponse.text);
  assert.equal(revisionsResponse.body.revisions.overdue, 1);
  assert.equal(revisionsResponse.body.revisions.dueToday, 1);
});

test("recent activity is ordered by supported timestamps", async () => {
  const response = await apiRequest("/api/analytics/overview", {
    token: ownerToken,
  });

  assert.equal(response.status, 200, response.text);
  assert.ok(response.body.recentActivity.length > 0);
  assert.equal(response.body.recentActivity[0].type, "revision");
  assert.equal(response.body.recentActivity[0].action, "reviewed");
  assert.equal(response.body.recentActivity[0].title, "Upcoming waves");
  assert.equal(response.body.recentActivity[1].type, "study_plan");
  assert.equal(response.body.recentActivity[1].title, "Physics plan");
  assert.equal(response.body.recentActivity[2].type, "quiz");

  const timestamps = response.body.recentActivity.map((event) =>
    new Date(event.timestamp).getTime()
  );

  assert.deepEqual(
    timestamps,
    [...timestamps].sort((left, right) => right - left)
  );
});

test("separate users receive only their own analytics", async () => {
  const [ownerResponse, otherResponse, emptyResponse] = await Promise.all([
    apiRequest("/api/analytics/overview", { token: ownerToken }),
    apiRequest("/api/analytics/overview", {
      token: otherOwnerToken,
    }),
    apiRequest("/api/analytics/overview", {
      token: emptyOwnerToken,
    }),
  ]);

  assert.equal(ownerResponse.status, 200);
  assert.equal(otherResponse.status, 200);
  assert.equal(emptyResponse.status, 200);
  assert.equal(otherResponse.body.studyPlans.total, 1);
  assert.equal(otherResponse.body.studyPlans.active, 1);
  assert.equal(otherResponse.body.studyPlans.totalTopics, 2);
  assert.equal(otherResponse.body.studyPlans.completedTopics, 1);
  assert.equal(otherResponse.body.studyPlans.completionPercentage, 50);
  assert.equal(otherResponse.body.quizzes.totalAttempts, 1);
  assert.equal(otherResponse.body.quizzes.averageScore, 100);
  assert.equal(otherResponse.body.revisions.total, 1);
  assert.equal(otherResponse.body.revisions.dueToday, 1);
  assert.equal(otherResponse.body.subjectPerformance.length, 1);
  assert.equal(
    otherResponse.body.subjectPerformance[0].name,
    "Other Subject"
  );
  assert.equal(emptyResponse.body.studyPlans.total, 0);
  assert.equal(emptyResponse.body.quizzes.totalAttempts, 0);
  assert.equal(emptyResponse.body.revisions.total, 0);
  assert.notEqual(
    ownerResponse.body.overall.trackedRecords,
    otherResponse.body.overall.trackedRecords
  );
});

test("analytics quiz pagination validates parameters and excludes future attempts", async () => {
  const firstPage = await apiRequest(
    "/api/analytics/quizzes?page=1&limit=2",
    { token: ownerToken }
  );

  assert.equal(firstPage.status, 200, firstPage.text);
  assert.equal(firstPage.body.attempts.length, 2);
  assert.equal(firstPage.body.pagination.total, 5);
  assert.equal(firstPage.body.pagination.totalPages, 3);
  assert.equal(firstPage.body.attempts[0].title, "General quiz");
  assert.equal(firstPage.body.scoreTrend.length, 5);

  const secondPage = await apiRequest(
    "/api/analytics/quizzes?page=2&limit=2",
    { token: ownerToken }
  );

  assert.equal(secondPage.status, 200, secondPage.text);
  assert.equal(secondPage.body.attempts.length, 2);
  assert.equal(secondPage.body.attempts[0].scorePercentage, 100);

  const invalidQueries = [
    "page=0",
    "page=abc",
    "limit=0",
    "limit=51",
    "limit=1.5",
    "owner=507f1f77bcf86cd799439011",
  ];

  for (const query of invalidQueries) {
    const response = await apiRequest(
      `/api/analytics/quizzes?${query}`,
      { token: ownerToken }
    );

    assert.equal(response.status, 400, query);
    assert.equal(response.body.success, false);
  }
});

test("analytics subject and quiz endpoints return compatible complete data", async () => {
  const [subjectsResponse, quizzesResponse] = await Promise.all([
    apiRequest("/api/analytics/subjects", { token: ownerToken }),
    apiRequest("/api/analytics/quizzes?page=1&limit=10", {
      token: ownerToken,
    }),
  ]);

  assert.equal(subjectsResponse.status, 200, subjectsResponse.text);
  assert.equal(subjectsResponse.body.studyPlans.total, 3);
  assert.equal(subjectsResponse.body.subjects.length, 2);
  assert.equal(
    subjectsResponse.body.subjects.find(
      (subject) => subject.name === "Physics"
    ).quizzes.attempts,
    2
  );

  assert.equal(quizzesResponse.status, 200, quizzesResponse.text);
  assert.equal(quizzesResponse.body.attempts.length, 5);
  assert.equal(quizzesResponse.body.pagination.total, 5);
  assert.equal(quizzesResponse.body.summary.totalAttempts, 5);
  assert.equal(quizzesResponse.body.summary.averageScore, 72);
  assert.equal(
    quizzesResponse.body.attempts.find((attempt) => attempt.subject)
      .subject.name,
    "Mathematics"
  );
  assert.equal(
    quizzesResponse.body.attempts.some(
      (attempt) => attempt.title === "Mechanics quiz" &&
        new Date(attempt.completedAt).getTime() > Date.now()
    ),
    false
  );
});
