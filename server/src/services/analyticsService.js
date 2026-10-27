import mongoose from "mongoose";
import QuizAttempt from "../models/QuizAttempt.js";
import RevisionItem from "../models/RevisionItem.js";
import StudyPlan from "../models/StudyPlan.js";
import Subject from "../models/Subject.js";
import {
  startOfNextUtcDay,
  startOfUtcDay,
} from "./revisionScheduler.js";

const TREND_LIMIT = 30;
const RECENT_QUIZ_LIMIT = 5;
const RECENT_ACTIVITY_LIMIT = 10;
const REMINDER_LIMIT = 5;
const TOPIC_MINIMUM_ATTEMPTS = 2;
const SAME_EVENT_WINDOW_MS = 5000;

function toValidDate(value) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? new Date(value) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function percentage(part, total) {
  if (!Number.isFinite(part) || !Number.isFinite(total) || total <= 0) {
    return 0;
  }

  return Math.round((part / total) * 100);
}

function sanitizeScore(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return 0;
  }

  return Math.min(100, Math.max(0, Math.round(number)));
}

function sanitizeCount(value) {
  const number = Number(value);

  if (!Number.isFinite(number) || number < 0) {
    return 0;
  }

  return Math.round(number);
}

function isNear(left, right) {
  if (!left || !right) {
    return false;
  }

  return Math.abs(left.getTime() - right.getTime()) <= SAME_EVENT_WINDOW_MS;
}

function getPlanTopics(plan) {
  return Array.isArray(plan.topics) ? plan.topics : [];
}

function buildMeta(now) {
  const todayStart = startOfUtcDay(now);
  const todayEnd = startOfNextUtcDay(now);

  return {
    timezone: "UTC",
    today: now.toISOString().slice(0, 10),
    todayStart,
    todayEnd,
    calculatedAt: now,
    trendLimit: TREND_LIMIT,
    recentQuizLimit: RECENT_QUIZ_LIMIT,
    recentActivityLimit: RECENT_ACTIVITY_LIMIT,
    reminderLimit: REMINDER_LIMIT,
    topicMinimumAttempts: TOPIC_MINIMUM_ATTEMPTS,
    averageScoreMethod:
      "Unweighted mean of persisted attempt score percentages, rounded to the nearest whole number.",
    accuracyMethod:
      "Correct answers divided by total answered questions, rounded to the nearest whole number.",
    futureTimestampRule:
      "Quiz attempts dated after the current server time are excluded from analytics.",
  };
}

function summarizeQuizFacet(facets) {
  const summary = facets.summary?.[0] || {};
  const recent = (facets.recent || []).map((attempt) => ({
    id: attempt.id,
    title: attempt.title,
    topic: attempt.topic || "",
    difficulty: attempt.difficulty || null,
    subjectId: attempt.subjectId || null,
    scorePercentage: sanitizeScore(attempt.scorePercentage),
    correctAnswers: sanitizeCount(attempt.correctAnswers),
    totalQuestions: sanitizeCount(attempt.totalQuestions),
    completedAt: attempt.completedAt,
  }));
  const totalAttempts = sanitizeCount(summary.totalAttempts);
  const correctAnswers = sanitizeCount(summary.correctAnswers);
  const totalQuestions = sanitizeCount(summary.totalQuestions);

  return {
    summary: {
      totalAttempts,
      averageScore: totalAttempts
        ? sanitizeScore(summary.averageScore)
        : 0,
      highestScore: totalAttempts
        ? sanitizeScore(summary.highestScore)
        : 0,
      latestScore: recent[0]?.scorePercentage ?? null,
      latestCompletedAt: recent[0]?.completedAt ?? null,
      correctAnswers,
      totalQuestions,
      accuracyPercentage: percentage(correctAnswers, totalQuestions),
    },
    recent,
    trend: (facets.trend || []).map((attempt) => ({
      id: attempt.id,
      title: attempt.title,
      scorePercentage: sanitizeScore(attempt.scorePercentage),
      completedAt: attempt.completedAt,
    })),
    bySubject: (facets.subjects || []).map((subject) => {
      const attempts = sanitizeCount(subject.attempts);
      const subjectCorrect = sanitizeCount(subject.correctAnswers);
      const subjectTotal = sanitizeCount(subject.totalQuestions);

      return {
        subjectId: String(subject._id),
        attempts,
        averageScore: attempts
          ? sanitizeScore(subject.averageScore)
          : 0,
        highestScore: attempts
          ? sanitizeScore(subject.highestScore)
          : 0,
        correctAnswers: subjectCorrect,
        totalQuestions: subjectTotal,
        accuracyPercentage: percentage(subjectCorrect, subjectTotal),
      };
    }),
    topics: (facets.topics || []).map((topic) => {
      const attempts = sanitizeCount(topic.attempts);
      const topicCorrect = sanitizeCount(topic.correctAnswers);
      const topicTotal = sanitizeCount(topic.totalQuestions);

      return {
        topic: topic.topic,
        attempts,
        averageScore: sanitizeScore(topic.averageScore),
        highestScore: sanitizeScore(topic.highestScore),
        correctAnswers: topicCorrect,
        totalQuestions: topicTotal,
        accuracyPercentage: percentage(topicCorrect, topicTotal),
      };
    }),
  };
}

export async function getStudyPlanAnalytics(userId, { now = new Date() } = {}) {
  const plans = await StudyPlan.find({ owner: userId })
    .select(
      "title subject examDate dailyStudyHours topics status createdAt updatedAt"
    )
    .lean();
  const todayStart = startOfUtcDay(now);
  const summary = {
    total: plans.length,
    active: 0,
    paused: 0,
    completed: 0,
    totalTopics: 0,
    completedTopics: 0,
    completionPercentage: 0,
    estimatedMinutes: 0,
    remainingMinutes: 0,
  };
  const bySubject = new Map();
  const upcoming = [];

  for (const plan of plans) {
    if (plan.status === "active") {
      summary.active += 1;
    } else if (plan.status === "paused") {
      summary.paused += 1;
    } else if (plan.status === "completed") {
      summary.completed += 1;
    }

    const topics = getPlanTopics(plan);
    const completedTopics = topics.filter((topic) => topic.completed).length;
    const estimatedMinutes = topics.reduce((total, topic) => {
      const minutes = Number(topic.estimatedMinutes);
      return total + (Number.isFinite(minutes) && minutes > 0 ? minutes : 0);
    }, 0);
    const remainingMinutes = topics.reduce((total, topic) => {
      if (topic.completed) {
        return total;
      }

      const minutes = Number(topic.estimatedMinutes);
      return total + (Number.isFinite(minutes) && minutes > 0 ? minutes : 0);
    }, 0);

    summary.totalTopics += topics.length;
    summary.completedTopics += completedTopics;
    summary.estimatedMinutes += estimatedMinutes;
    summary.remainingMinutes += remainingMinutes;

    if (plan.subject) {
      const subjectId = String(plan.subject);
      const group = bySubject.get(subjectId) || {
        planCount: 0,
        totalTopics: 0,
        completedTopics: 0,
        estimatedMinutes: 0,
        remainingMinutes: 0,
      };

      group.planCount += 1;
      group.totalTopics += topics.length;
      group.completedTopics += completedTopics;
      group.estimatedMinutes += estimatedMinutes;
      group.remainingMinutes += remainingMinutes;
      bySubject.set(subjectId, group);
    }

    const examDate = toValidDate(plan.examDate);

    if (examDate && todayStart && examDate >= todayStart) {
      upcoming.push({
        id: String(plan._id),
        title: plan.title,
        subjectId: plan.subject ? String(plan.subject) : null,
        examDate,
        dailyStudyHours: plan.dailyStudyHours,
        status: plan.status,
        totalTopics: topics.length,
        completedTopics,
        completionPercentage: percentage(completedTopics, topics.length),
      });
    }
  }

  summary.completionPercentage = percentage(
    summary.completedTopics,
    summary.totalTopics
  );

  upcoming.sort(
    (left, right) =>
      new Date(left.examDate).getTime() - new Date(right.examDate).getTime()
  );

  return {
    summary,
    upcoming: upcoming.slice(0, 4),
    plans,
    bySubject,
  };
}

export async function getQuizAnalytics(userId, { now = new Date() } = {}) {
  const owner = new mongoose.Types.ObjectId(String(userId));
  const [facets] = await QuizAttempt.aggregate([
    {
      $match: {
        owner,
        completedAt: { $lte: now },
        scorePercentage: { $gte: 0, $lte: 100 },
      },
    },
    {
      $facet: {
        summary: [
          {
            $group: {
              _id: null,
              totalAttempts: { $sum: 1 },
              averageScore: { $avg: "$scorePercentage" },
              highestScore: { $max: "$scorePercentage" },
              correctAnswers: { $sum: "$correctAnswers" },
              totalQuestions: { $sum: "$totalQuestions" },
            },
          },
        ],
        recent: [
          { $sort: { completedAt: -1, createdAt: -1, _id: -1 } },
          { $limit: RECENT_QUIZ_LIMIT },
          {
            $project: {
              _id: 0,
              id: { $toString: "$_id" },
              title: "$quizTitle",
              topic: { $ifNull: ["$topic", ""] },
              difficulty: "$difficulty",
              subjectId: {
                $cond: [
                  { $eq: [{ $type: "$subject" }, "objectId"] },
                  { $toString: "$subject" },
                  null,
                ],
              },
              scorePercentage: 1,
              correctAnswers: 1,
              totalQuestions: 1,
              completedAt: 1,
            },
          },
        ],
        trend: [
          { $sort: { completedAt: -1, createdAt: -1, _id: -1 } },
          { $limit: TREND_LIMIT },
          { $sort: { completedAt: 1, createdAt: 1, _id: 1 } },
          {
            $project: {
              _id: 0,
              id: { $toString: "$_id" },
              title: "$quizTitle",
              scorePercentage: 1,
              completedAt: 1,
            },
          },
        ],
        subjects: [
          { $match: { subject: { $type: "objectId" } } },
          {
            $group: {
              _id: "$subject",
              attempts: { $sum: 1 },
              averageScore: { $avg: "$scorePercentage" },
              highestScore: { $max: "$scorePercentage" },
              correctAnswers: { $sum: "$correctAnswers" },
              totalQuestions: { $sum: "$totalQuestions" },
            },
          },
        ],
        topics: [
          { $match: { topic: { $type: "string" } } },
          {
            $addFields: {
              normalizedTopic: {
                $toLower: { $trim: { input: "$topic" } },
              },
            },
          },
          { $match: { normalizedTopic: { $ne: "" } } },
          {
            $group: {
              _id: "$normalizedTopic",
              topic: { $first: "$topic" },
              attempts: { $sum: 1 },
              averageScore: { $avg: "$scorePercentage" },
              highestScore: { $max: "$scorePercentage" },
              correctAnswers: { $sum: "$correctAnswers" },
              totalQuestions: { $sum: "$totalQuestions" },
            },
          },
          { $match: { attempts: { $gte: TOPIC_MINIMUM_ATTEMPTS } } },
          { $sort: { averageScore: 1, attempts: -1, topic: 1 } },
        ],
      },
    },
  ]);

  return summarizeQuizFacet(facets || {});
}

export async function getRevisionAnalytics(userId, { now = new Date() } = {}) {
  const items = await RevisionItem.find({ owner: userId })
    .select(
      "topic subject priority status nextReviewAt lastReviewedAt reviewCount createdAt updatedAt"
    )
    .lean();
  const todayStart = startOfUtcDay(now);
  const todayEnd = startOfNextUtcDay(now);
  const summary = {
    total: items.length,
    pending: 0,
    inProgress: 0,
    active: 0,
    dueToday: 0,
    overdue: 0,
    upcoming: 0,
    unscheduled: 0,
    completed: 0,
    completionPercentage: 0,
    totalReviews: 0,
  };
  const priorityBreakdown = { low: 0, medium: 0, high: 0 };
  const reminders = {
    overdue: [],
    dueToday: [],
    upcoming: [],
  };

  const serializeReminder = (item) => ({
    id: String(item._id),
    topic: item.topic,
    subjectId: item.subject ? String(item.subject) : null,
    priority: item.priority,
    status: item.status,
    nextReviewAt: item.nextReviewAt || null,
    lastReviewedAt: item.lastReviewedAt || null,
    reviewCount: sanitizeCount(item.reviewCount),
  });

  for (const item of items) {
    summary.totalReviews += sanitizeCount(item.reviewCount);

    if (Object.hasOwn(priorityBreakdown, item.priority)) {
      priorityBreakdown[item.priority] += 1;
    }

    if (item.status === "completed") {
      summary.completed += 1;
      continue;
    }

    summary.active += 1;

    if (item.status === "in_progress") {
      summary.inProgress += 1;
    } else {
      summary.pending += 1;
    }

    const nextReviewAt = toValidDate(item.nextReviewAt);

    if (!nextReviewAt || !todayStart || !todayEnd) {
      summary.unscheduled += 1;
      continue;
    }

    if (nextReviewAt < todayStart) {
      summary.overdue += 1;
      reminders.overdue.push(serializeReminder(item));
    } else if (nextReviewAt < todayEnd) {
      summary.dueToday += 1;
      reminders.dueToday.push(serializeReminder(item));
    } else {
      summary.upcoming += 1;
      reminders.upcoming.push(serializeReminder(item));
    }
  }

  const byReviewDate = (left, right) =>
    new Date(left.nextReviewAt).getTime() -
    new Date(right.nextReviewAt).getTime();

  reminders.overdue.sort(byReviewDate);
  reminders.dueToday.sort(byReviewDate);
  reminders.upcoming.sort(byReviewDate);
  summary.completionPercentage = percentage(
    summary.completed,
    summary.total
  );

  return {
    summary,
    reminders: {
      overdue: reminders.overdue.slice(0, REMINDER_LIMIT),
      dueToday: reminders.dueToday.slice(0, REMINDER_LIMIT),
      upcoming: reminders.upcoming.slice(0, REMINDER_LIMIT),
    },
    priorityBreakdown,
    items,
  };
}

function buildSubjectPerformance(subjects, planBySubject, quizBySubject) {
  return subjects
    .map((subject) => {
      const subjectId = String(subject._id);
      const planGroup = planBySubject.get(subjectId) || {
        planCount: 0,
        totalTopics: 0,
        completedTopics: 0,
        estimatedMinutes: 0,
        remainingMinutes: 0,
      };
      const quizGroup = quizBySubject.get(subjectId) || {
        attempts: 0,
        averageScore: 0,
        highestScore: 0,
        correctAnswers: 0,
        totalQuestions: 0,
        accuracyPercentage: 0,
      };

      return {
        id: subjectId,
        name: subject.name,
        color: subject.color || "",
        plans: {
          total: planGroup.planCount,
          totalTopics: planGroup.totalTopics,
          completedTopics: planGroup.completedTopics,
          completionPercentage: percentage(
            planGroup.completedTopics,
            planGroup.totalTopics
          ),
          estimatedMinutes: planGroup.estimatedMinutes,
          remainingMinutes: planGroup.remainingMinutes,
        },
        quizzes: {
          attempts: quizGroup.attempts,
          averageScore: quizGroup.averageScore,
          highestScore: quizGroup.highestScore,
          correctAnswers: quizGroup.correctAnswers,
          totalQuestions: quizGroup.totalQuestions,
          accuracyPercentage: quizGroup.accuracyPercentage,
        },
        hasQuizData: quizGroup.attempts > 0,
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name));
}

function buildRecentActivity({ plans, recentQuizzes, revisions, now }) {
  const events = [];
  const pushEvent = (event) => {
    const timestamp = toValidDate(event.timestamp);

    if (!timestamp || timestamp > now) {
      return;
    }

    events.push({ ...event, timestamp });
  };

  for (const plan of plans) {
    const createdAt = toValidDate(plan.createdAt);
    const updatedAt = toValidDate(plan.updatedAt) || createdAt;

    pushEvent({
      id: String(plan._id),
      type: "study_plan",
      action: isNear(createdAt, updatedAt) ? "created" : "updated",
      title: plan.title,
      timestamp: updatedAt,
    });
  }

  for (const attempt of recentQuizzes) {
    pushEvent({
      id: attempt.id,
      type: "quiz",
      action: "completed",
      title: attempt.title,
      timestamp: attempt.completedAt,
      scorePercentage: attempt.scorePercentage,
    });
  }

  for (const item of revisions) {
    const createdAt = toValidDate(item.createdAt);
    const updatedAt = toValidDate(item.updatedAt) || createdAt;
    const lastReviewedAt = toValidDate(item.lastReviewedAt);
    let action = "updated";
    let timestamp = updatedAt || createdAt;

    if (lastReviewedAt && isNear(lastReviewedAt, updatedAt)) {
      action = item.status === "completed" ? "mastered" : "reviewed";
      timestamp = lastReviewedAt;
    } else if (isNear(createdAt, timestamp)) {
      action = "created";
      timestamp = createdAt || timestamp;
    }

    pushEvent({
      id: String(item._id),
      type: "revision",
      action,
      title: item.topic,
      timestamp,
    });
  }

  return events
    .sort((left, right) => {
      const difference =
        right.timestamp.getTime() - left.timestamp.getTime();

      if (difference !== 0) {
        return difference;
      }

      return left.title.localeCompare(right.title);
    })
    .slice(0, RECENT_ACTIVITY_LIMIT);
}

export async function getAnalyticsOverview(
  userId,
  { now = new Date() } = {}
) {
  const [planAnalytics, quizAnalytics, revisionAnalytics, subjects] =
    await Promise.all([
      getStudyPlanAnalytics(userId, { now }),
      getQuizAnalytics(userId, { now }),
      getRevisionAnalytics(userId, { now }),
      Subject.find({ owner: userId }).select("name color").lean(),
    ]);
  const quizBySubject = new Map(
    quizAnalytics.bySubject.map((subject) => [
      subject.subjectId,
      subject,
    ])
  );
  const subjectPerformance = buildSubjectPerformance(
    subjects,
    planAnalytics.bySubject,
    quizBySubject
  );
  const recentActivity = buildRecentActivity({
    plans: planAnalytics.plans,
    recentQuizzes: quizAnalytics.recent,
    revisions: revisionAnalytics.items,
    now,
  });
  const overall = {
    studyCompletionPercentage: planAnalytics.summary.completionPercentage,
    quizAverageScore: quizAnalytics.summary.averageScore,
    revisionCompletionPercentage:
      revisionAnalytics.summary.completionPercentage,
    trackedRecords:
      planAnalytics.summary.total +
      quizAnalytics.summary.totalAttempts +
      revisionAnalytics.summary.total,
  };

  return {
    success: true,
    meta: buildMeta(now),
    studyPlans: {
      ...planAnalytics.summary,
      upcoming: planAnalytics.upcoming,
    },
    quizzes: {
      ...quizAnalytics.summary,
      trend: quizAnalytics.trend,
    },
    revisions: {
      ...revisionAnalytics.summary,
      reminders: revisionAnalytics.reminders,
      priorityBreakdown: revisionAnalytics.priorityBreakdown,
    },
    overall,
    subjectPerformance,
    topicPerformance: quizAnalytics.topics,
    recentQuizzes: quizAnalytics.recent,
    recentActivity,
  };
}

function serializeAttemptSubject(subjectId, subjectById) {
  if (!subjectId) {
    return null;
  }

  const subject = subjectById.get(String(subjectId));

  if (!subject) {
    return null;
  }

  return {
    id: String(subject._id),
    name: subject.name,
    color: subject.color || "",
  };
}

async function getQuizAttemptPage(userId, { page, limit, now }) {
  const filter = {
    owner: userId,
    completedAt: { $lte: now },
    scorePercentage: { $gte: 0, $lte: 100 },
  };
  const [attempts, total, subjects] = await Promise.all([
    QuizAttempt.find(filter)
      .select(
        "subject topic quizTitle difficulty scorePercentage correctAnswers totalQuestions timeTakenSeconds completedAt"
      )
      .sort({ completedAt: -1, createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    QuizAttempt.countDocuments(filter),
    Subject.find({ owner: userId }).select("name color").lean(),
  ]);
  const subjectById = new Map(
    subjects.map((subject) => [String(subject._id), subject])
  );

  return {
    attempts: attempts.map((attempt) => ({
      id: String(attempt._id),
      title: attempt.quizTitle,
      topic: attempt.topic || "",
      difficulty: attempt.difficulty || null,
      subject: serializeAttemptSubject(attempt.subject, subjectById),
      scorePercentage: sanitizeScore(attempt.scorePercentage),
      correctAnswers: sanitizeCount(attempt.correctAnswers),
      totalQuestions: sanitizeCount(attempt.totalQuestions),
      timeTakenSeconds: sanitizeCount(attempt.timeTakenSeconds),
      completedAt: attempt.completedAt,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    },
  };
}

export async function getAnalyticsQuizzes(
  userId,
  { page, limit, now = new Date() }
) {
  const [pageData, quizAnalytics] = await Promise.all([
    getQuizAttemptPage(userId, { page, limit, now }),
    getQuizAnalytics(userId, { now }),
  ]);

  return {
    success: true,
    meta: buildMeta(now),
    attempts: pageData.attempts,
    pagination: pageData.pagination,
    summary: quizAnalytics.summary,
    scoreTrend: quizAnalytics.trend,
  };
}

export async function getAnalyticsSubjects(
  userId,
  { now = new Date() } = {}
) {
  const [planAnalytics, quizAnalytics, subjects] = await Promise.all([
    getStudyPlanAnalytics(userId, { now }),
    getQuizAnalytics(userId, { now }),
    Subject.find({ owner: userId }).select("name color").lean(),
  ]);
  const quizBySubject = new Map(
    quizAnalytics.bySubject.map((subject) => [
      subject.subjectId,
      subject,
    ])
  );

  return {
    success: true,
    meta: buildMeta(now),
    studyPlans: planAnalytics.summary,
    subjects: buildSubjectPerformance(
      subjects,
      planAnalytics.bySubject,
      quizBySubject
    ),
  };
}

export async function getAnalyticsRevisions(
  userId,
  { now = new Date() } = {}
) {
  const revisionAnalytics = await getRevisionAnalytics(userId, { now });

  return {
    success: true,
    meta: buildMeta(now),
    revisions: {
      ...revisionAnalytics.summary,
      reminders: revisionAnalytics.reminders,
      priorityBreakdown: revisionAnalytics.priorityBreakdown,
    },
  };
}
