import { Router } from "express";
import { searchUsers, getSuggestedUsers } from "../controller/connect.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = Router();

// SEARCH
router.get("/search", authMiddleware, searchUsers);

// SUGGEST
router.get("/suggestions", authMiddleware, getSuggestedUsers);

export default router;
