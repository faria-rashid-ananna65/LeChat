import { Router, type Request, type Response } from "express";
import { registerUser, loginUser, getUserProfile } from "../controller/auth.js";
import { validate } from "../middleware/validation.middleware.js";
import { registerSchema, loginSchema } from "../lib/validation.js";
import { authMiddleware } from "../middleware/auth.middleware.js";


const router = Router();

// REGISTER
router.post("/register", validate(registerSchema), registerUser);

// LOGIN
router.post("/login", validate(loginSchema), loginUser);

// LOGOUT
router.post("/logout", authMiddleware, async (req: Request, res: Response) => {
  res.json({ msg: "Logged out successfully" });
});

// GET - Get current user profile
router.get("/me", authMiddleware, getUserProfile);

export default router;
