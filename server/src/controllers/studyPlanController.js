import mongoose from "mongoose";
import StudyPlan from "../models/StudyPlan.js";
import Subject from "../models/Subject.js";
import {
  buildStudySchedule,
  createGenerationKey,
} from "../services/studyPlanner.js";
import { asyncHandler } from "../utils/http.js";
import { serializeStudyPlan } from "../utils/serializeStudyPlan.js";
import {
  validateStudyPlanInput,
  validateTopicCompletion,
} from "../utils/studyPlanValidation.js";
import { hasOwn, isValidObjectId } from "../utils/validation.js";

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
    message: "Study plan not found.",
  });
}

function sendGenerationFailure(res, result) {
  const status = result.reason === "insufficient_time" ? 422 : 400;

  return res.status(status).json({
    success: false,
    message: result.message,
    reason: result.reason,
    feasibility: result.details,
  });
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

async function populatePlan(plan) {
  await plan.populate(SUBJECT_POPULATION);
  return plan;
}

async function findOwnedPlan(userId, planId) {
  if (!isValidObjectId(planId)) {
    return null;
  }

  return StudyPlan.findOne({
    _id: planId,
    owner: userId,
  }).populate(SUBJECT_POPULATION);
}

function handlePlanValidationError(res, error) {
  if (error instanceof mongoose.Error.ValidationError) {
    return validationError(
      res,
      "Please check the study plan details and try again."
    );
  }

  throw error;
}

export const listStudyPlans = asyncHandler(async (req, res) => {
  const plans = await StudyPlan.find({ owner: req.user.id })
    .sort({ createdAt: -1 })
    .populate(SUBJECT_POPULATION);

  return res.status(200).json({
    success: true,
    plans: plans.map(serializeStudyPlan),
  });
});

export const createStudyPlan = asyncHandler(async (req, res) => {
  const validation = validateStudyPlanInput(req.body);

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

  const plan = new StudyPlan({
    ...data,
    owner: req.user.id,
  });

  try {
    await plan.save();
  } catch (error) {
    return handlePlanValidationError(res, error);
  }

  await populatePlan(plan);

  return res.status(201).json({
    success: true,
    message: "Study plan created.",
    plan: serializeStudyPlan(plan),
  });
});

export const generateStudyPlan = asyncHandler(async (req, res) => {
  const validation = validateStudyPlanInput(req.body);

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

  const plan = new StudyPlan({
    ...data,
    owner: req.user.id,
  });
  const generationKey = createGenerationKey(plan);
  const existingPlan = await StudyPlan.findOne({
    owner: req.user.id,
    generationKey,
  }).populate(SUBJECT_POPULATION);

  if (existingPlan) {
    return res.status(200).json({
      success: true,
      message: "A matching generated study plan already exists.",
      duplicate: true,
      plan: serializeStudyPlan(existingPlan),
    });
  }

  const scheduleResult = buildStudySchedule({
    examDate: plan.examDate,
    dailyStudyHours: plan.dailyStudyHours,
    topics: plan.topics,
  });

  if (!scheduleResult.feasible) {
    return sendGenerationFailure(res, scheduleResult);
  }

  plan.generationKey = generationKey;
  plan.schedule = scheduleResult.schedule;

  try {
    await plan.save();
  } catch (error) {
    if (error?.code === 11000) {
      const matchingPlan = await StudyPlan.findOne({
        owner: req.user.id,
        generationKey,
      }).populate(SUBJECT_POPULATION);

      if (matchingPlan) {
        return res.status(200).json({
          success: true,
          message: "A matching generated study plan already exists.",
          duplicate: true,
          plan: serializeStudyPlan(matchingPlan),
        });
      }
    }

    return handlePlanValidationError(res, error);
  }

  await populatePlan(plan);

  return res.status(201).json({
    success: true,
    message: "Study plan generated.",
    plan: serializeStudyPlan(plan),
  });
});

export const updateStudyPlan = asyncHandler(async (req, res) => {
  const plan = await findOwnedPlan(req.user.id, req.params.id);

  if (!plan) {
    return notFound(res);
  }

  const validation = validateStudyPlanInput(req.body, {
    partial: true,
    existingTopics: plan.topics,
  });

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

  const schedulingChanged =
    validation.topicsChanged ||
    hasOwn(req.body, "examDate") ||
    hasOwn(req.body, "dailyStudyHours");

  Object.assign(plan, data);

  if (schedulingChanged) {
    plan.schedule = [];
    plan.set("generationKey", undefined);
  }

  try {
    await plan.save();
  } catch (error) {
    return handlePlanValidationError(res, error);
  }

  await populatePlan(plan);

  return res.status(200).json({
    success: true,
    message: "Study plan updated.",
    plan: serializeStudyPlan(plan),
  });
});

export const generateExistingPlanSchedule = asyncHandler(async (req, res) => {
  const plan = await findOwnedPlan(req.user.id, req.params.id);

  if (!plan) {
    return notFound(res);
  }

  const scheduleResult = buildStudySchedule({
    examDate: plan.examDate,
    dailyStudyHours: plan.dailyStudyHours,
    topics: plan.topics,
  });

  if (!scheduleResult.feasible) {
    return sendGenerationFailure(res, scheduleResult);
  }

  plan.schedule = scheduleResult.schedule;
  await plan.save();
  await populatePlan(plan);

  return res.status(200).json({
    success: true,
    message: "Study schedule generated.",
    plan: serializeStudyPlan(plan),
  });
});

export const updateTopicCompletion = asyncHandler(async (req, res) => {
  if (!isValidObjectId(req.params.topicId)) {
    return notFound(res);
  }

  const plan = await findOwnedPlan(req.user.id, req.params.id);

  if (!plan) {
    return notFound(res);
  }

  const validation = validateTopicCompletion(req.body);

  if (validation.error) {
    return validationError(res, validation.error);
  }

  const topic = plan.topics.find(
    (item) => String(item._id) === req.params.topicId
  );

  if (!topic) {
    return res.status(404).json({
      success: false,
      message: "Topic not found.",
    });
  }

  topic.completed = validation.data.completed;
  await plan.save();
  await populatePlan(plan);

  return res.status(200).json({
    success: true,
    message: "Topic progress updated.",
    plan: serializeStudyPlan(plan),
  });
});

export const deleteStudyPlan = asyncHandler(async (req, res) => {
  const plan = await findOwnedPlan(req.user.id, req.params.id);

  if (!plan) {
    return notFound(res);
  }

  await plan.deleteOne();

  return res.status(204).send();
});
