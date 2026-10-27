import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { after, before, test } from "node:test";
import mongoose from "mongoose";

const runId = randomBytes(6).toString("hex");
const allowedOrigin = "http://localhost:5173";
const testMongoUri =
  process.env.MONGODB_TEST_URI ||
  "mongodb://127.0.0.1:27017/preppilot_ai_revision_test";
const MS_PER_DAY = 24 * 60 * 60 * 1000;

process.env.NODE_ENV = "test";
process.env.CLIENT_URL = allowedOrigin;
process.env.JWT_SECRET = randomBytes(48).toString("hex");

let app;
let User;
let Subject;
let StudyPlan;
let RevisionItem;
let signAccessToken;
let scheduler;
let server;
let baseUrl;
let owner;
let otherOwner;
let summaryOwner;
let ownerToken;
let otherOwnerToken;
let summaryOwnerToken;
const createdUserIds = [];

function makeEmail(label) {
  return `revision-test-${runId}-${label}@example.com`;
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

async function createSubject(token, name = "Revision Subject") {
  const response = await apiRequest("/api/subjects", {
    method: "POST",
    token,
    body: {
      name,
      description: "Revision test subject",
      color: "#38bdf8",
    },
  });

  assert.equal(response.status, 201);
  return response.body.subject;
}

async function createRevision(token, overrides = {}) {
  const response = await apiRequest("/api/revisions", {
    method: "POST",
    token,
    body: {
      topic: "Cell structure",
      notes: "Review organelles and membranes.",
      priority: "medium",
      ...overrides,
    },
  });

  assert.equal(response.status, 201, response.text);
  return response.body.revision;
}

async function createPlan(token, overrides = {}) {
  const response = await apiRequest("/api/study-plans", {
    method: "POST",
    token,
    body: {
      title: `Revision Source Plan ${runId}`,
      description: "Plan used for revision import",
      dailyStudyHours: 2,
      status: "active",
      topics: [
        {
          title: "Photosynthesis",
          description: "Light and dark reactions",
          estimatedMinutes: 45,
        },
        {
          title: "Respiration",
          description: "Aerobic and anaerobic",
          estimatedMinutes: 30,
        },
      ],
      ...overrides,
    },
  });

  assert.equal(response.status, 201, response.text);
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
  ({ default: RevisionItem } = await import("../src/models/RevisionItem.js"));
  ({ signAccessToken } = await import("../src/utils/tokens.js"));
  scheduler = await import("../src/services/revisionScheduler.js");

  await Promise.all([
    User.init(),
    Subject.init(),
    StudyPlan.init(),
    RevisionItem.init(),
  ]);

  owner = await User.create({
    name: "Revision Owner",
    email: makeEmail("owner"),
    password: "test-password",
  });
  otherOwner = await User.create({
    name: "Revision Other",
    email: makeEmail("other"),
    password: "test-password",
  });
  summaryOwner = await User.create({
    name: "Revision Summary",
    email: makeEmail("summary"),
    password: "test-password",
  });
  createdUserIds.push(owner._id, otherOwner._id, summaryOwner._id);
  ownerToken = signAccessToken(owner._id);
  otherOwnerToken = signAccessToken(otherOwner._id);
  summaryOwnerToken = signAccessToken(summaryOwner._id);

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

test("revision routes require authentication", async () => {
  const requests = [
    apiRequest("/api/revisions"),
    apiRequest("/api/revisions", { method: "POST", body: {} }),
    apiRequest("/api/revisions/today"),
    apiRequest("/api/revisions/summary"),
    apiRequest("/api/revisions/not-an-id"),
    apiRequest("/api/revisions/not-an-id", { method: "PUT", body: {} }),
    apiRequest("/api/revisions/not-an-id", { method: "DELETE" }),
    apiRequest("/api/revisions/not-an-id/review", {
      method: "PATCH",
      body: {},
    }),
    apiRequest("/api/revisions/from-study-plan/not-an-id", {
      method: "POST",
    }),
  ];

  for (const responsePromise of requests) {
    const response = await responsePromise;

    assert.equal(response.status, 401);
    assert.equal(response.body.success, false);
  }
});

test("revision CRUD is authenticated, normalized, and owner-scoped", async () => {
  const subject = await createSubject(ownerToken, "Biology");
  const createResponse = await apiRequest("/api/revisions", {
    method: "POST",
    token: ownerToken,
    body: {
      topic: "  Cell structure  ",
      notes: "  Review organelles and membranes.  ",
      priority: "high",
      subject: subject.id,
    },
  });

  assert.equal(createResponse.status, 201, createResponse.text);
  const revision = createResponse.body.revision;

  assert.equal(revision.topic, "Cell structure");
  assert.equal(revision.notes, "Review organelles and membranes.");
  assert.equal(revision.priority, "high");
  assert.equal(revision.status, "pending");
  assert.equal(revision.subject.id, subject.id);
  assert.equal(revision.subject.name, "Biology");
  assert.equal(revision.reviewCount, 0);
  assert.equal(revision.owner, undefined);
  assert.equal(revision.lastReviewedAt, null);
  assert.ok(
    Math.abs(
      new Date(revision.nextReviewAt).getTime() -
        new Date(revision.createdAt).getTime() -
        MS_PER_DAY
    ) < 5000
  );

  const stored = await RevisionItem.findById(revision.id).lean();
  assert.equal(String(stored.owner), String(owner._id));
  assert.equal(stored.reviewCount, 0);

  const ownerList = await apiRequest("/api/revisions", {
    token: ownerToken,
  });
  const otherList = await apiRequest("/api/revisions", {
    token: otherOwnerToken,
  });

  assert.equal(ownerList.status, 200);
  assert.ok(
    ownerList.body.revisions.some((item) => item.id === revision.id)
  );
  assert.equal(otherList.status, 200);
  assert.equal(
    otherList.body.revisions.some((item) => item.id === revision.id),
    false
  );

  const ownerGet = await apiRequest(`/api/revisions/${revision.id}`, {
    token: ownerToken,
  });
  const foreignGet = await apiRequest(`/api/revisions/${revision.id}`, {
    token: otherOwnerToken,
  });
  const foreignUpdate = await apiRequest(`/api/revisions/${revision.id}`, {
    method: "PUT",
    token: otherOwnerToken,
    body: { topic: "Stolen" },
  });
  const foreignDelete = await apiRequest(`/api/revisions/${revision.id}`, {
    method: "DELETE",
    token: otherOwnerToken,
  });

  assert.equal(ownerGet.status, 200);
  assert.equal(ownerGet.body.revision.id, revision.id);
  assert.equal(foreignGet.status, 404);
  assert.equal(foreignUpdate.status, 404);
  assert.equal(foreignDelete.status, 404);

  const updateResponse = await apiRequest(
    `/api/revisions/${revision.id}`,
    {
      method: "PUT",
      token: ownerToken,
      body: {
        topic: "  Cell organelles  ",
        priority: "low",
        status: "in_progress",
        subject: null,
      },
    }
  );

  assert.equal(updateResponse.status, 200);
  assert.equal(updateResponse.body.revision.topic, "Cell organelles");
  assert.equal(updateResponse.body.revision.priority, "low");
  assert.equal(updateResponse.body.revision.status, "in_progress");
  assert.equal(updateResponse.body.revision.subject, null);

  const deleteResponse = await apiRequest(
    `/api/revisions/${revision.id}`,
    {
      method: "DELETE",
      token: ownerToken,
    }
  );

  assert.equal(deleteResponse.status, 204);
  assert.equal(deleteResponse.text, "");
  assert.equal(await RevisionItem.exists({ _id: revision.id }), null);

  await apiRequest(`/api/subjects/${subject.id}`, {
    method: "DELETE",
    token: ownerToken,
  });
});

test("revision validation rejects invalid IDs, fields, and dates", async () => {
  const countBefore = await RevisionItem.countDocuments({
    owner: owner._id,
  });
  const createCases = [
    {},
    { topic: "   " },
    { topic: "x".repeat(201) },
    { topic: "Valid", notes: 42 },
    { topic: "Valid", notes: "x".repeat(3001) },
    { topic: "Valid", priority: "urgent" },
    { topic: "Valid", status: "archived" },
    { topic: "Valid", subject: "not-an-object-id" },
    { topic: "Valid", nextReviewAt: new Date().toISOString() },
    { topic: "Valid", reviewCount: 4 },
    { topic: "Valid", lastReviewedAt: new Date().toISOString() },
    { topic: "Valid", owner: otherOwner._id.toString() },
  ];

  for (const body of createCases) {
    const response = await apiRequest("/api/revisions", {
      method: "POST",
      token: ownerToken,
      body,
    });

    assert.equal(response.status, 400, JSON.stringify(body));
    assert.equal(response.body.success, false);
  }

  assert.equal(
    await RevisionItem.countDocuments({ owner: owner._id }),
    countBefore
  );

  const item = await createRevision(ownerToken, {
    topic: `Validation Item ${runId}`,
  });
  const invalidIdResponses = [
    await apiRequest("/api/revisions/not-an-id", { token: ownerToken }),
    await apiRequest("/api/revisions/not-an-id", {
      method: "PUT",
      token: ownerToken,
      body: { topic: "Nope" },
    }),
    await apiRequest("/api/revisions/not-an-id", {
      method: "DELETE",
      token: ownerToken,
    }),
    await apiRequest("/api/revisions/not-an-id/review", {
      method: "PATCH",
      token: ownerToken,
      body: {},
    }),
  ];

  for (const response of invalidIdResponses) {
    assert.equal(response.status, 404);
  }

  const updateCases = [
    {},
    { topic: "   " },
    { priority: "urgent" },
    { status: "archived" },
    { subject: "not-an-object-id" },
    { nextReviewAt: new Date().toISOString() },
    { reviewCount: 5 },
  ];

  for (const body of updateCases) {
    const response = await apiRequest(`/api/revisions/${item.id}`, {
      method: "PUT",
      token: ownerToken,
      body,
    });

    assert.equal(response.status, 400, JSON.stringify(body));
  }

  const reviewCases = [
    { reviewCount: 10 },
    { nextReviewAt: new Date().toISOString() },
    { lastReviewedAt: new Date().toISOString() },
    { status: "completed" },
    { topic: "Changed" },
    { mastered: "yes" },
  ];

  for (const body of reviewCases) {
    const response = await apiRequest(
      `/api/revisions/${item.id}/review`,
      {
        method: "PATCH",
        token: ownerToken,
        body,
      }
    );

    assert.equal(response.status, 400, JSON.stringify(body));
  }

  const unchanged = await RevisionItem.findById(item.id).lean();
  assert.equal(unchanged.reviewCount, 0);
  assert.equal(unchanged.lastReviewedAt ?? null, null);
  assert.equal(unchanged.status, "pending");

  await apiRequest(`/api/revisions/${item.id}`, {
    method: "DELETE",
    token: ownerToken,
  });
});

test("revision subjects must belong to the authenticated owner", async () => {
  const foreignSubject = await createSubject(
    otherOwnerToken,
    "Foreign Revision Subject"
  );
  const countBefore = await RevisionItem.countDocuments({
    owner: owner._id,
  });
  const createResponse = await apiRequest("/api/revisions", {
    method: "POST",
    token: ownerToken,
    body: {
      topic: "Foreign subject attempt",
      subject: foreignSubject.id,
    },
  });

  assert.equal(createResponse.status, 404);
  assert.equal(createResponse.body.success, false);
  assert.equal(
    await RevisionItem.countDocuments({ owner: owner._id }),
    countBefore
  );

  const item = await createRevision(ownerToken, {
    topic: `Subject Change ${runId}`,
  });
  const updateResponse = await apiRequest(
    `/api/revisions/${item.id}`,
    {
      method: "PUT",
      token: ownerToken,
      body: { subject: foreignSubject.id },
    }
  );

  assert.equal(updateResponse.status, 404);
  assert.equal(
    (await RevisionItem.findById(item.id).lean()).subject,
    undefined
  );

  await apiRequest(`/api/revisions/${item.id}`, {
    method: "DELETE",
    token: ownerToken,
  });
  await apiRequest(`/api/subjects/${foreignSubject.id}`, {
    method: "DELETE",
    token: otherOwnerToken,
  });
});

test("revision intervals follow the documented UTC policy", () => {
  const base = new Date("2026-10-27T12:00:00.000Z");
  const expectedIntervals = [1, 3, 7, 14, 30, 30];
  const expectedDelays = [1, 3, 7, 14, 30, 30];

  expectedIntervals.forEach((interval, completedReviews) => {
    assert.equal(
      scheduler.getRevisionIntervalDays(completedReviews),
      interval
    );
  });

  expectedDelays.forEach((days, completedReviews) => {
    const next = scheduler.scheduleNextReview(base, completedReviews);
    assert.equal(next.getTime() - base.getTime(), days * MS_PER_DAY);
  });

  assert.equal(
    scheduler.scheduleInitialReview(base).getTime() - base.getTime(),
    MS_PER_DAY
  );
  assert.equal(
    scheduler.startOfUtcDay(new Date("2026-10-27T23:30:00.000Z")).toISOString(),
    "2026-10-27T00:00:00.000Z"
  );
});

test("recording reviews updates counts, timestamps, status, and intervals", async () => {
  const item = await createRevision(ownerToken, {
    topic: `Interval Review ${runId}`,
  });
  const expectedDelays = [3, 7, 14, 30, 30];
  let previousReviewTime = 0;

  for (let index = 0; index < expectedDelays.length; index += 1) {
    const response = await apiRequest(
      `/api/revisions/${item.id}/review`,
      {
        method: "PATCH",
        token: ownerToken,
        body: { mastered: false },
      }
    );

    assert.equal(response.status, 200, response.text);
    const revision = response.body.revision;

    assert.equal(revision.reviewCount, index + 1);
    assert.equal(revision.status, "in_progress");
    assert.ok(revision.lastReviewedAt);
    assert.equal(
      new Date(revision.nextReviewAt).getTime() -
        new Date(revision.lastReviewedAt).getTime(),
      expectedDelays[index] * MS_PER_DAY
    );
    assert.ok(
      new Date(revision.lastReviewedAt).getTime() >= previousReviewTime
    );
    previousReviewTime = new Date(revision.lastReviewedAt).getTime();
  }
});

test("explicit mastery completes an item and blocks further reviews", async () => {
  const item = await createRevision(ownerToken, {
    topic: `Mastered Topic ${runId}`,
  });
  const masteredResponse = await apiRequest(
    `/api/revisions/${item.id}/review`,
    {
      method: "PATCH",
      token: ownerToken,
      body: { mastered: true },
    }
  );

  assert.equal(masteredResponse.status, 200);
  const mastered = masteredResponse.body.revision;
  assert.equal(mastered.status, "completed");
  assert.equal(mastered.isCompleted, true);
  assert.equal(mastered.reviewCount, 1);
  assert.equal(
    new Date(mastered.nextReviewAt).getTime() -
      new Date(mastered.lastReviewedAt).getTime(),
    3 * MS_PER_DAY
  );

  const repeat = await apiRequest(`/api/revisions/${item.id}/review`, {
    method: "PATCH",
    token: ownerToken,
    body: { mastered: true },
  });

  assert.equal(repeat.status, 409);
  assert.equal(repeat.body.reason, "revision_completed");
  const stored = await RevisionItem.findById(item.id).lean();
  assert.equal(stored.reviewCount, 1);
  assert.equal(stored.status, "completed");
});

test("today and summary endpoints use UTC due states and isolate owners", async () => {
  const now = new Date();
  const todayStart = scheduler.startOfUtcDay(now);
  const due = await RevisionItem.create({
    owner: summaryOwner._id,
    topic: "Due Today",
    status: "pending",
    nextReviewAt: new Date(todayStart.getTime() + 12 * 60 * 60 * 1000),
  });
  const overdue = await RevisionItem.create({
    owner: summaryOwner._id,
    topic: "Overdue",
    status: "pending",
    nextReviewAt: new Date(todayStart.getTime() - 60 * 60 * 1000),
  });
  const upcoming = await RevisionItem.create({
    owner: summaryOwner._id,
    topic: "Upcoming",
    status: "in_progress",
    nextReviewAt: new Date(todayStart.getTime() + 2 * MS_PER_DAY),
  });
  const completed = await RevisionItem.create({
    owner: summaryOwner._id,
    topic: "Completed",
    status: "completed",
    nextReviewAt: new Date(todayStart.getTime() + 12 * 60 * 60 * 1000),
    reviewCount: 5,
    lastReviewedAt: new Date(todayStart.getTime() - MS_PER_DAY),
  });

  await RevisionItem.create({
    owner: otherOwner._id,
    topic: "Foreign Due",
    status: "pending",
    nextReviewAt: new Date(todayStart.getTime() + 12 * 60 * 60 * 1000),
  });

  const todayResponse = await apiRequest("/api/revisions/today", {
    token: summaryOwnerToken,
  });
  const summaryResponse = await apiRequest("/api/revisions/summary", {
    token: summaryOwnerToken,
  });
  const ownerList = await apiRequest("/api/revisions", {
    token: summaryOwnerToken,
  });
  const otherToday = await apiRequest("/api/revisions/today", {
    token: otherOwnerToken,
  });

  assert.equal(todayResponse.status, 200);
  assert.equal(todayResponse.body.count, 2);
  assert.deepEqual(
    todayResponse.body.revisions.map((item) => item.id),
    [String(overdue._id), String(due._id)]
  );
  assert.equal(todayResponse.body.revisions[0].isOverdue, true);
  assert.equal(todayResponse.body.revisions[1].isDueToday, true);

  assert.equal(summaryResponse.status, 200);
  assert.deepEqual(summaryResponse.body.summary, {
    total: 4,
    pending: 2,
    inProgress: 1,
    active: 3,
    dueToday: 1,
    overdue: 1,
    upcoming: 1,
    completed: 1,
    completionPercentage: 25,
  });

  assert.equal(ownerList.status, 200);
  const listedIds = ownerList.body.revisions.map((item) => item.id);
  assert.ok(listedIds.includes(String(due._id)));
  assert.ok(listedIds.includes(String(completed._id)));
  assert.equal(listedIds.includes(String(upcoming._id)), true);
  assert.equal(otherToday.status, 200);
  assert.ok(
    otherToday.body.revisions.some(
      (item) => item.topic === "Foreign Due"
    )
  );
  assert.equal(
    otherToday.body.revisions.some(
      (item) =>
        item.id === String(due._id) ||
        item.id === String(overdue._id) ||
        item.id === String(completed._id)
    ),
    false
  );
});

test("importing revision items from a study plan is duplicate-safe", async () => {
  const subject = await createSubject(ownerToken, "Import Biology");
  const plan = await createPlan(ownerToken, {
    subject: subject.id,
    title: `Import Plan ${runId}`,
  });
  const foreignPlan = await createPlan(otherOwnerToken, {
    title: `Foreign Import Plan ${runId}`,
  });
  const beforeImport = await StudyPlan.findById(plan.id).lean();
  const foreignResponse = await apiRequest(
    `/api/revisions/from-study-plan/${foreignPlan.id}`,
    {
      method: "POST",
      token: ownerToken,
    }
  );

  assert.equal(foreignResponse.status, 404);

  const before = Date.now();
  const firstImport = await apiRequest(
    `/api/revisions/from-study-plan/${plan.id}`,
    {
      method: "POST",
      token: ownerToken,
    }
  );

  assert.equal(firstImport.status, 201, firstImport.text);
  assert.equal(firstImport.body.created, 2);
  assert.equal(firstImport.body.skipped, 0);
  assert.equal(firstImport.body.plan.id, plan.id);

  const imported = await RevisionItem.find({
    owner: owner._id,
    sourcePlan: plan.id,
  }).lean();

  assert.equal(imported.length, 2);
  for (const item of imported) {
    assert.equal(String(item.subject), subject.id);
    assert.equal(item.status, "pending");
    assert.equal(item.reviewCount, 0);
    assert.equal(item.lastReviewedAt, undefined);
    assert.ok(item.sourceTopic);
    assert.ok(
      new Date(item.nextReviewAt).getTime() - before >=
        MS_PER_DAY - 5000
    );
  }

  const afterImport = await StudyPlan.findById(plan.id).lean();
  assert.equal(afterImport.topics.length, beforeImport.topics.length);
  assert.deepEqual(
    afterImport.topics.map((topic) => topic.title),
    beforeImport.topics.map((topic) => topic.title)
  );

  const duplicateImport = await apiRequest(
    `/api/revisions/from-study-plan/${plan.id}`,
    {
      method: "POST",
      token: ownerToken,
    }
  );

  assert.equal(duplicateImport.status, 200);
  assert.equal(duplicateImport.body.created, 0);
  assert.equal(duplicateImport.body.skipped, 2);
  assert.equal(
    await RevisionItem.countDocuments({
      owner: owner._id,
      sourcePlan: plan.id,
    }),
    2
  );

  await StudyPlan.updateOne(
    { _id: plan.id },
    {
      $push: {
        topics: {
          title: "New Imported Topic",
          description: "Added after the first import",
          completed: false,
          estimatedMinutes: 20,
          order: 2,
        },
      },
    }
  );

  const incrementalImport = await apiRequest(
    `/api/revisions/from-study-plan/${plan.id}`,
    {
      method: "POST",
      token: ownerToken,
    }
  );

  assert.equal(incrementalImport.status, 201);
  assert.equal(incrementalImport.body.created, 1);
  assert.equal(incrementalImport.body.skipped, 2);
  assert.equal(
    await RevisionItem.countDocuments({
      owner: owner._id,
      sourcePlan: plan.id,
    }),
    3
  );

  const emptyPlan = await StudyPlan.create({
    owner: owner._id,
    title: `Empty Import Plan ${runId}`,
    dailyStudyHours: 2,
    status: "active",
    topics: [],
    generationKey: `empty-import-plan-${runId}`,
  });
  const emptyImport = await apiRequest(
    `/api/revisions/from-study-plan/${emptyPlan._id}`,
    {
      method: "POST",
      token: ownerToken,
    }
  );

  assert.equal(emptyImport.status, 400);
  assert.equal(emptyImport.body.reason, "no_valid_topics");

  await apiRequest(`/api/study-plans/${foreignPlan.id}`, {
    method: "DELETE",
    token: otherOwnerToken,
  });
});
