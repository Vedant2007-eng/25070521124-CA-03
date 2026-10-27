import { Router } from "express";
import {
  getOverview,
  getQuizzes,
  getRevisions,
  getSubjects,
} from "../controllers/analyticsController.js";
import authenticate from "../middleware/authenticate.js";

const router = Router();

router.use(authenticate);

router.get("/overview", getOverview);
router.get("/quizzes", getQuizzes);
router.get("/subjects", getSubjects);
router.get("/revisions", getRevisions);

export default router;
