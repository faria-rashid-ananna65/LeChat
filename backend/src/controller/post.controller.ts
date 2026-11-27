import { type Request, type Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// 1. CREATE POST
export const createPost = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const { caption } = req.body;

    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    if (!caption || !String(caption).trim()) {
      res.status(400).json({ message: "Caption is required" });
      return;
    }

    const post = await prisma.post.create({
      data: {
        caption: String(caption).trim(),
        userId,
      },
      include: {
        user: { select: { id: true, name: true, avatar: true } },
        _count: { select: { likes: true, comments: true } },
      },
    });

    res.status(201).json(post);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Failed to create post" });
  }
};

// 2. GET ALL POSTS
export const getPosts = async (req: Request, res: Response) => {
  try {
    const posts = await prisma.post.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, name: true, avatar: true } },
        likes: { select: { userId: true } },
        comments: {
          orderBy: { createdAt: "asc" },
          include: {
            user: { select: { id: true, name: true, avatar: true } },
          },
        },
        _count: { select: { likes: true, comments: true } },
      },
    });

    res.json(posts);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Failed to fetch posts" });
  }
};

// 3. UPDATE POST
export const updatePost = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const postId = String(req.params.postId);
    const { caption } = req.body;

    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const post = await prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      res.status(404).json({ message: "Post not found" });
      return;
    }

    if (post.userId !== userId) {
      res.status(403).json({ message: "You are not authorized to update this post" });
      return;
    }

    if (!caption || !String(caption).trim()) {
      res.status(400).json({ message: "Caption is required" });
      return;
    }

    const updatedPost = await prisma.post.update({
      where: { id: postId },
      data: { caption: String(caption).trim() },
      include: {
        user: { select: { id: true, name: true, avatar: true } },
        _count: { select: { likes: true, comments: true } },
      },
    });

    res.json(updatedPost);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Failed to update post" });
  }
};

// 4. DELETE POST
export const deletePost = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const postId = String(req.params.postId);

    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const post = await prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      res.status(404).json({ message: "Post not found" });
      return;
    }

    if (post.userId !== userId) {
      res.status(403).json({ message: "You are not authorized to delete this post" });
      return;
    }

    await prisma.$transaction([
      prisma.like.deleteMany({ where: { postId } }),
      prisma.comment.deleteMany({ where: { postId } }),
      prisma.post.delete({ where: { id: postId } }),
    ]);

    res.json({ message: "Post deleted successfully" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Failed to delete post" });
  }
};

// 5. LIKE / UNLIKE POST (Toggle)
export const toggleLike = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const postId = String(req.params.postId);

    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post) {
      res.status(404).json({ message: "Post not found" });
      return;
    }

    // Check if user already liked this post
    const existingLike = await prisma.like.findUnique({
      where: {
        userId_postId: { userId, postId },
      },
    });

    if (existingLike) {
      // Unlike
      await prisma.like.delete({
        where: { id: existingLike.id },
      });
      res.json({ liked: false, message: "Post unliked" });
      return;
    }

    // Like
    await prisma.like.create({
      data: { userId, postId },
    });

    res.status(201).json({ liked: true, message: "Post liked" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Failed to toggle like" });
  }
};

// 6. ADD COMMENT
export const addComment = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const postId = String(req.params.postId);
    const { text } = req.body;

    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    if (!text || !String(text).trim()) {
      res.status(400).json({ message: "Comment text is required" });
      return;
    }

    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post) {
      res.status(404).json({ message: "Post not found" });
      return;
    }

    const comment = await prisma.comment.create({
      data: {
        text: String(text).trim(),
        userId,
        postId,
      },
      include: {
        user: { select: { id: true, name: true, avatar: true } },
      },
    });

    res.status(201).json(comment);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Failed to add comment" });
  }
};

// 7. DELETE COMMENT
export const deleteComment = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const commentId = String(req.params.commentId);

    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: { post: { select: { userId: true } } },
    });

    if (!comment) {
      res.status(404).json({ message: "Comment not found" });
      return;
    }

    // Only the comment author or the post owner can delete the comment
    if (comment.userId !== userId && comment.post.userId !== userId) {
      res.status(403).json({ message: "You are not authorized to delete this comment" });
      return;
    }

    await prisma.comment.delete({
      where: { id: commentId },
    });

    res.json({ message: "Comment deleted successfully" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Failed to delete comment" });
  }
};
