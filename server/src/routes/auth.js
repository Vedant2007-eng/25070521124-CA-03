import { Router } from "express";
import {
  getCurrentUser,
  login,
  register,
} from "../controllers/authController.js";
import authenticate from "../middleware/authenticate.js";
import { authRateLimiter } from "../middleware/authRateLimit.js";

const router = Router();

router.post("/register", authRateLimiter, register);
router.post("/login", authRateLimiter, login);
router.get("/me", authenticate, getCurrentUser);

export default router;
