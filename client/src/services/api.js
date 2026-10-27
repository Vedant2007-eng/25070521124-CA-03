import axios from "axios";

function getDefaultBaseURL() {
  if (typeof window !== "undefined" && window.location?.hostname) {
    return `${window.location.protocol}//${window.location.hostname}:5000`;
  }

  return "http://localhost:5000";
}

const baseURL = (import.meta.env.VITE_API_URL || getDefaultBaseURL()).replace(
  /\/$/,
  ""
);

const api = axios.create({
  baseURL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

let authToken = null;
let unauthorizedHandler = null;

export function setAuthToken(token) {
  authToken = token || null;
}

export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = handler;

  return () => {
    if (unauthorizedHandler === handler) {
      unauthorizedHandler = null;
    }
  };
}

api.interceptors.request.use((config) => {
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const requestUrl = error.config?.url || "";
    const isLoginOrRegistration =
      /\/api\/auth\/(login|register)(?:\?|$)/.test(requestUrl);

    if (status === 401 && authToken && !isLoginOrRegistration) {
      authToken = null;
      unauthorizedHandler?.();
    }

    return Promise.reject(error);
  }
);

export function checkApiHealth() {
  return api.get("/api/health");
}

export function registerAccount(values) {
  return api.post("/api/auth/register", values);
}

export function loginAccount(values) {
  return api.post("/api/auth/login", values);
}

export function getCurrentUser() {
  return api.get("/api/auth/me");
}

export function getSubjects() {
  return api.get("/api/subjects");
}

export function createSubject(values) {
  return api.post("/api/subjects", values);
}

export function updateSubject(subjectId, values) {
  return api.put(`/api/subjects/${subjectId}`, values);
}

export function deleteSubject(subjectId) {
  return api.delete(`/api/subjects/${subjectId}`);
}

export function getStudyPlans() {
  return api.get("/api/study-plans");
}

export function createStudyPlan(values) {
  return api.post("/api/study-plans", values);
}

export function updateStudyPlan(planId, values) {
  return api.put(`/api/study-plans/${planId}`, values);
}

export function deleteStudyPlan(planId) {
  return api.delete(`/api/study-plans/${planId}`);
}

export function generateStudyPlan(values) {
  return api.post("/api/study-plans/generate", values);
}

export function generateStudyPlanSchedule(planId) {
  return api.post(`/api/study-plans/${planId}/generate`);
}

export function updateStudyPlanTopic(planId, topicId, completed) {
  return api.patch(`/api/study-plans/${planId}/topics/${topicId}`, {
    completed,
  });
}

export function generateQuiz(values) {
  return api.post("/api/quizzes/generate", values, {
    timeout: 45000,
  });
}

export function submitQuiz(quizId, answers) {
  return api.post(`/api/quizzes/${quizId}/submit`, { answers });
}

export function getRevisions() {
  return api.get("/api/revisions");
}

export function createRevision(values) {
  return api.post("/api/revisions", values);
}

export function getRevision(revisionId) {
  return api.get(`/api/revisions/${revisionId}`);
}

export function updateRevision(revisionId, values) {
  return api.put(`/api/revisions/${revisionId}`, values);
}

export function deleteRevision(revisionId) {
  return api.delete(`/api/revisions/${revisionId}`);
}

export function reviewRevision(revisionId, { mastered }) {
  return api.patch(`/api/revisions/${revisionId}/review`, { mastered });
}

export function getTodayRevisions() {
  return api.get("/api/revisions/today");
}

export function getRevisionSummary() {
  return api.get("/api/revisions/summary");
}

export function generateRevisionsFromStudyPlan(planId) {
  return api.post(`/api/revisions/from-study-plan/${planId}`);
}

export function getQuizHistory({ page = 1, limit = 5 } = {}) {
  return api.get("/api/quizzes/history", {
    params: { page, limit },
  });
}

export function getAnalyticsOverview() {
  return api.get("/api/analytics/overview");
}

export function getAnalyticsQuizzes({ page = 1, limit = 10 } = {}) {
  return api.get("/api/analytics/quizzes", {
    params: { page, limit },
  });
}

export function getAnalyticsSubjects() {
  return api.get("/api/analytics/subjects");
}

export function getAnalyticsRevisions() {
  return api.get("/api/analytics/revisions");
}

export default api;
