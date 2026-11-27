import { Router } from "express";
import { searchUsers, getSuggestedUsers, sendFriendRequest, acceptFriendRequest, getPendingRequests } from "../controller/connect.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = Router();


router.get("/search", authMiddleware, searchUsers);
router.get("/suggest", authMiddleware, getSuggestedUsers);
router.post("/friend-request", authMiddleware, sendFriendRequest);
router.put("/friend-request/:requestId/accept", authMiddleware, acceptFriendRequest);
router.get("/friend-request/pending", authMiddleware, getPendingRequests);

export default router;
