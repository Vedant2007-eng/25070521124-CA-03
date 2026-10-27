import { Router } from "express";
import {
  createRevision,
  deleteRevision,
  generateFromStudyPlan,
  getRevision,
  getRevisionSummary,
  listRevisions,
  listTodayRevisions,
  reviewRevision,
  updateRevision,
} from "../controllers/revisionController.js";
import authenticate from "../middleware/authenticate.js";

const router = Router();

router.use(authenticate);

router.get("/", listRevisions);
router.post("/", createRevision);
router.get("/today", listTodayRevisions);
router.get("/summary", getRevisionSummary);
router.post("/from-study-plan/:planId", generateFromStudyPlan);
router.get("/:id", getRevision);
router.put("/:id", updateRevision);
router.delete("/:id", deleteRevision);
router.patch("/:id/review", reviewRevision);

export default router;
