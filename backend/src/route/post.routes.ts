import { Router } from "express";
import {
  createPost,
  getPosts,
  updatePost,
  deletePost,
  toggleLike,
  addComment,
  deleteComment,
} from "../controller/post.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/", authMiddleware, getPosts);
router.post("/", authMiddleware, createPost);
router.put("/:postId", authMiddleware, updatePost);
router.delete("/:postId", authMiddleware, deletePost);
// Like / Unlike
router.post("/:postId/like", authMiddleware, toggleLike);

// Comment Add / Delete
router.post("/:postId/comments", authMiddleware, addComment);
router.delete("/comments/:commentId", authMiddleware, deleteComment);

export default router;
