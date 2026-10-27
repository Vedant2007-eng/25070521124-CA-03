import mongoose from "mongoose";
import RevisionItem from "../models/RevisionItem.js";
import StudyPlan from "../models/StudyPlan.js";
import Subject from "../models/Subject.js";
import {
  getRevisionTiming,
  scheduleInitialReview,
  scheduleNextReview,
  startOfNextUtcDay,
} from "../services/revisionScheduler.js";
import { asyncHandler } from "../utils/http.js";
import {
  serializeRevision,
  sortRevisions,
} from "../utils/serializeRevision.js";
import {
  validateRevisionInput,
  validateRevisionReview,
} from "../utils/revisionValidation.js";
import { isValidObjectId } from "../utils/validation.js";

const SUBJECT_POPULATION = { path: "subject", select: "name color" };

function validationError(res, message) {
  return res.status(400).json({
    success: false,
    message,
  });
}

function notFound(res) {
  return res.status(404).json({
    success: false,
    message: "Revision item not found.",
  });
}

function handleValidationError(res, error) {
  if (error instanceof mongoose.Error.ValidationError) {
    return validationError(
      res,
      "Please check the revision details and try again."
    );
  }

  throw error;
}

async function findOwnedRevision(userId, revisionId) {
  if (!isValidObjectId(revisionId)) {
    return null;
  }

  return RevisionItem.findOne({
    _id: revisionId,
    owner: userId,
  }).populate(SUBJECT_POPULATION);
}

async function ensureSubjectIsOwned(userId, subjectId) {
  if (!subjectId) {
    return true;
  }

  return Boolean(
    await Subject.exists({
      _id: subjectId,
      owner: userId,
    })
  );
}

async function populateRevision(item) {
  await item.populate(SUBJECT_POPULATION);
  return item;
}

export const listRevisions = asyncHandler(async (req, res) => {
  const items = await RevisionItem.find({ owner: req.user.id })
    .populate(SUBJECT_POPULATION)
    .sort({ createdAt: -1 });
  const now = new Date();

  items.sort(sortRevisions);

  return res.status(200).json({
    success: true,
    revisions: items.map((item) => serializeRevision(item, { now })),
  });
});

export const createRevision = asyncHandler(async (req, res) => {
  const validation = validateRevisionInput(req.body);

  if (validation.error) {
    return validationError(res, validation.error);
  }

  const { data } = validation;

  if (!(await ensureSubjectIsOwned(req.user.id, data.subject))) {
    return res.status(404).json({
      success: false,
      message: "Subject not found.",
    });
  }

  const now = new Date();
  const item = new RevisionItem({
    ...data,
    owner: req.user.id,
    nextReviewAt: scheduleInitialReview(now),
    reviewCount: 0,
  });

  try {
    await item.save();
  } catch (error) {
    return handleValidationError(res, error);
  }

  await populateRevision(item);

  return res.status(201).json({
    success: true,
    message: "Revision item created.",
    revision: serializeRevision(item, { now }),
  });
});

export const getRevision = asyncHandler(async (req, res) => {
  const item = await findOwnedRevision(req.user.id, req.params.id);

  if (!item) {
    return notFound(res);
  }

  return res.status(200).json({
    success: true,
    revision: serializeRevision(item),
  });
});

export const updateRevision = asyncHandler(async (req, res) => {
  const item = await findOwnedRevision(req.user.id, req.params.id);

  if (!item) {
    return notFound(res);
  }

  const validation = validateRevisionInput(req.body, { partial: true });

  if (validation.error) {
    return validationError(res, validation.error);
  }

  const { data } = validation;

  if (!(await ensureSubjectIsOwned(req.user.id, data.subject))) {
    return res.status(404).json({
      success: false,
      message: "Subject not found.",
    });
  }

  Object.assign(item, data);

  try {
    await item.save();
  } catch (error) {
    return handleValidationError(res, error);
  }

  await populateRevision(item);

  return res.status(200).json({
    success: true,
    message: "Revision item updated.",
    revision: serializeRevision(item),
  });
});

export const deleteRevision = asyncHandler(async (req, res) => {
  const item = await findOwnedRevision(req.user.id, req.params.id);

  if (!item) {
    return notFound(res);
  }

  await item.deleteOne();

  return res.status(204).send();
});

export const reviewRevision = asyncHandler(async (req, res) => {
  const item = await findOwnedRevision(req.user.id, req.params.id);

  if (!item) {
    return notFound(res);
  }

  if (item.status === "completed") {
    return res.status(409).json({
      success: false,
      message: "This revision item is already completed.",
      reason: "revision_completed",
    });
  }

  const validation = validateRevisionReview(req.body);

  if (validation.error) {
    return validationError(res, validation.error);
  }

  const now = new Date();
  const nextReviewCount = item.reviewCount + 1;

  item.reviewCount = nextReviewCount;
  item.lastReviewedAt = now;
  item.nextReviewAt = scheduleNextReview(now, nextReviewCount);
  item.status = validation.data.mastered ? "completed" : "in_progress";

  try {
    await item.save();
  } catch (error) {
    return handleValidationError(res, error);
  }

  await populateRevision(item);

  return res.status(200).json({
    success: true,
    message: validation.data.mastered
      ? "Revision completed and mastered."
      : "Review recorded.",
    revision: serializeRevision(item, { now }),
  });
});

export const listTodayRevisions = asyncHandler(async (req, res) => {
  const now = new Date();
  const items = await RevisionItem.find({
    owner: req.user.id,
    status: { $ne: "completed" },
    nextReviewAt: { $lt: startOfNextUtcDay(now) },
  })
    .populate(SUBJECT_POPULATION)
    .sort({ nextReviewAt: 1 });

  return res.status(200).json({
    success: true,
    count: items.length,
    revisions: items.map((item) => serializeRevision(item, { now })),
  });
});

export const getRevisionSummary = asyncHandler(async (req, res) => {
  const now = new Date();
  const items = await RevisionItem.find({ owner: req.user.id })
    .select("status nextReviewAt")
    .lean();
  const summary = {
    total: items.length,
    pending: 0,
    inProgress: 0,
    active: 0,
    dueToday: 0,
    overdue: 0,
    upcoming: 0,
    completed: 0,
    completionPercentage: 0,
  };

  for (const item of items) {
    if (item.status === "completed") {
      summary.completed += 1;
      continue;
    }

    summary.active += 1;
    summary[item.status === "in_progress" ? "inProgress" : "pending"] += 1;

    const timing = getRevisionTiming(item.nextReviewAt, {
      status: item.status,
      now,
    });

    if (timing.isOverdue) {
      summary.overdue += 1;
    } else if (timing.isDueToday) {
      summary.dueToday += 1;
    } else if (timing.isUpcoming) {
      summary.upcoming += 1;
    }
  }

  summary.completionPercentage =
    summary.total === 0
      ? 0
      : Math.round((summary.completed / summary.total) * 100);

  return res.status(200).json({
    success: true,
    summary,
  });
});

export const generateFromStudyPlan = asyncHandler(async (req, res) => {
  if (!isValidObjectId(req.params.planId)) {
    return res.status(404).json({
      success: false,
      message: "Study plan not found.",
    });
  }

  const plan = await StudyPlan.findOne({
    _id: req.params.planId,
    owner: req.user.id,
  }).lean();

  if (!plan) {
    return res.status(404).json({
      success: false,
      message: "Study plan not found.",
    });
  }

  const topics = (plan.topics || []).filter(
    (topic) =>
      topic._id &&
      typeof topic.title === "string" &&
      topic.title.trim().length > 0
  );

  if (topics.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Add at least one valid topic to the study plan first.",
      reason: "no_valid_topics",
    });
  }

  const now = new Date();
  const nextReviewAt = scheduleInitialReview(now);
  const subjectId = plan.subject || null;
  const operations = topics.map((topic) => ({
    updateOne: {
      filter: {
        owner: req.user.id,
        sourcePlan: plan._id,
        sourceTopic: topic._id,
      },
      update: {
        $setOnInsert: {
          owner: req.user.id,
          subject: subjectId,
          topic: topic.title.trim().slice(0, 200),
          notes: (topic.description || "").trim().slice(0, 3000),
          priority: "medium",
          status: "pending",
          nextReviewAt,
          reviewCount: 0,
          sourcePlan: plan._id,
          sourceTopic: topic._id,
        },
      },
      upsert: true,
    },
  }));
  const result = await RevisionItem.bulkWrite(operations, {
    ordered: false,
  });
  const created = result.upsertedCount;

  return res.status(created > 0 ? 201 : 200).json({
    success: true,
    message:
      created > 0
        ? "Revision items generated from the study plan."
        : "All study-plan topics already have revision items.",
    created,
    skipped: topics.length - created,
    plan: {
      id: String(plan._id),
      title: plan.title,
    },
  });
});
