import { type Request, type Response } from "express";
import { PrismaClient } from "@prisma/client";
import redis from "../config/redis.js";
import { type AuthRequest } from "../middleware/auth.middleware.js";

const prisma = new PrismaClient();

// 1. SEARCH - Search users by name
export const searchUsers = async (req: Request, res: Response) => {
  const query = String(req.query.query || "");
  const myId = req.user?.userId || req.user?.id;

  // Check Redis only if a search query is provided
  if (query) {
    const cacheData = await redis.get(`search:${query}`);
    if (cacheData) {
      console.log("Returned from Redis, skipped DB");
      res.json(JSON.parse(cacheData));
      return;
    }
  }

  const users = await prisma.user.findMany({
    where: {
      name: { contains: query, mode: "insensitive" },
      ...(myId ? { id: { not: myId } } : {}),
    },
    select: { id: true, name: true, avatar: true },
  });

  if (query) {
    await redis.set(`search:${query}`, JSON.stringify(users), "EX", 300);
  }
  res.json(users);
};

// 2. SUGGEST - Get suggested users who are not friends yet
export const getSuggestedUsers = async (req: Request, res: Response) => {
  try {
    const myId = req.user?.userId || req.user?.id;
    if (!myId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    // Check Redis cache first
    const cached = await redis.get(`suggest:${myId}`);
    if (cached) {
      console.log("Returned suggestions from Redis");
      res.json(JSON.parse(cached));
      return;
    }

    // 1. Fetch current user's existing friend IDs
    const myFriends = await prisma.friendship.findMany({
      where: { userId: myId },
      select: { friendId: true },
    });
    const friendIds = myFriends.map((f) => f.friendId);

    // 2. Fetch users excluding self and existing friends
    const users = await prisma.user.findMany({
      where: {
        id: { notIn: [myId, ...friendIds] },
      },
      select: { id: true, name: true, avatar: true },
      take: 10,
    });

    // 3. Cache suggestions in Redis for 2 minutes
    await redis.set(`suggest:${myId}`, JSON.stringify(users), "EX", 120);

    res.json(users);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Failed to fetch suggestions" });
  }
};

// 3. SEND FRIEND REQUEST
export const sendFriendRequest = async (req: Request, res: Response) => {
  try {
    const senderId = req.user?.userId || req.user?.id;
    const { receiverId } = req.body;

    if (!senderId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    if (senderId === receiverId) {
      res.status(400).json({ message: "You cannot send a friend request to yourself" });
      return;
    }

    // Check if a friend request already exists between both users
    const oldRequest = await prisma.friendRequest.findFirst({
      where: {
        OR: [
          { senderId: senderId, receiverId: receiverId },
          { senderId: receiverId, receiverId: senderId },
        ],
      },
    });

    if (oldRequest) {
      res.status(400).json({ message: "Friend request already sent" });
      return;
    }

    // Create a new friend request
    const newRequest = await prisma.friendRequest.create({
      data: {
        senderId: senderId,
        receiverId: receiverId,
        status: "PENDING",
      },
      include: {
        sender: { select: { id: true, name: true, avatar: true } },
      },
    });

    // Clear suggestion caches since suggested users have changed
    await redis.del(`suggest:${senderId}`);
    await redis.del(`suggest:${receiverId}`);

    res.json(newRequest);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Failed to send friend request" });
  }
};

// 4. ACCEPT FRIEND REQUEST
export const acceptFriendRequest = async (
  req: Request,
  res: Response
) => {
  try {
    const myId = req.user?.userId || req.user?.id;
    const requestId = String(req.params.requestId);

    if (!myId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const request = await prisma.friendRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      return res.status(404).json({ message: "Friend request not found" });
    }

    if (request.receiverId !== myId) {
      return res.status(403).json({ message: "You are not authorized to accept this request" });
    }

    if (request.status !== "PENDING") {
      return res.status(400).json({
        message: "Request already processed",
      });
    }

    await prisma.$transaction(async (tx) => {
      const updated = await tx.friendRequest.updateMany({
        where: {
          id: requestId,
          receiverId: myId,
          status: "PENDING",
        },
        data: {
          status: "ACCEPTED",
        },
      });

      if (updated.count !== 1) {
        throw new Error("REQUEST_ALREADY_PROCESSED");
      }

      await tx.friendship.createMany({
        data: [
          {
            userId: request.senderId,
            friendId: request.receiverId,
          },
          {
            userId: request.receiverId,
            friendId: request.senderId,
          },
        ],
      });
    });

    await redis.del(`suggest:${request.senderId}`);
    await redis.del(`suggest:${request.receiverId}`);

    return res.json({
      message: "Friend request accepted",
    });
  } catch (err) {
    console.log(err);

    if (
      err instanceof Error &&
      err.message === "REQUEST_ALREADY_PROCESSED"
    ) {
      return res.status(409).json({
        message: "Request already processed",
      });
    }

    return res.status(500).json({
      message: "Failed to accept friend request",
    });
  }
};

// 5. GET PENDING FRIEND REQUESTS
export const getPendingRequests = async (req: Request, res: Response) => {
  const myId = req.user?.userId || req.user?.id;

  const requests = await prisma.friendRequest.findMany({
    where: { receiverId: myId, status: "PENDING" },
    include: {
      sender: { select: { id: true, name: true, avatar: true } },
    },
  });

  res.json(requests);
};
