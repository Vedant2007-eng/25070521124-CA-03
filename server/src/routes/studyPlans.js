import { Router } from "express";
import {
  createStudyPlan,
  deleteStudyPlan,
  generateExistingPlanSchedule,
  generateStudyPlan,
  listStudyPlans,
  updateStudyPlan,
  updateTopicCompletion,
} from "../controllers/studyPlanController.js";
import authenticate from "../middleware/authenticate.js";

const router = Router();

router.use(authenticate);

router.get("/", listStudyPlans);
router.post("/", createStudyPlan);
router.post("/generate", generateStudyPlan);
router.put("/:id", updateStudyPlan);
router.delete("/:id", deleteStudyPlan);
router.post("/:id/generate", generateExistingPlanSchedule);
router.patch("/:id/topics/:topicId", updateTopicCompletion);

export default router;
