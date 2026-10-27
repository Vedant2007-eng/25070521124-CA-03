import { Router } from "express";
import {
  generateQuiz,
  listQuizHistory,
  submitQuiz,
} from "../controllers/quizController.js";
import authenticate from "../middleware/authenticate.js";
import { quizGenerationRateLimiter } from "../middleware/quizRateLimit.js";

const router = Router();

router.use(authenticate);

router.post("/generate", quizGenerationRateLimiter, generateQuiz);
router.get("/history", listQuizHistory);
router.post("/:quizId/submit", submitQuiz);

export default router;
