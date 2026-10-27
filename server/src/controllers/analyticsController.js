import {
  getAnalyticsOverview,
  getAnalyticsQuizzes,
  getAnalyticsRevisions,
  getAnalyticsSubjects,
} from "../services/analyticsService.js";
import { asyncHandler } from "../utils/http.js";
import { validateAnalyticsPaginationQuery } from "../utils/analyticsValidation.js";

function validationError(res, message) {
  return res.status(400).json({
    success: false,
    message,
  });
}

export const getOverview = asyncHandler(async (req, res) => {
  const analytics = await getAnalyticsOverview(req.user.id);

  return res.status(200).json(analytics);
});

export const getQuizzes = asyncHandler(async (req, res) => {
  const validation = validateAnalyticsPaginationQuery(req.query);

  if (validation.error) {
    return validationError(res, validation.error);
  }

  const analytics = await getAnalyticsQuizzes(req.user.id, validation.data);

  return res.status(200).json(analytics);
});

export const getSubjects = asyncHandler(async (req, res) => {
  const analytics = await getAnalyticsSubjects(req.user.id);

  return res.status(200).json(analytics);
});

export const getRevisions = asyncHandler(async (req, res) => {
  const analytics = await getAnalyticsRevisions(req.user.id);

  return res.status(200).json(analytics);
});
