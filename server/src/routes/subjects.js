import { Router } from "express";
import {
  createSubject,
  deleteSubject,
  listSubjects,
  updateSubject,
} from "../controllers/subjectController.js";
import authenticate from "../middleware/authenticate.js";

const router = Router();

router.use(authenticate);

router.get("/", listSubjects);
router.post("/", createSubject);
router.put("/:id", updateSubject);
router.delete("/:id", deleteSubject);

export default router;
