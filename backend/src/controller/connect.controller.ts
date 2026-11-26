import { type Request, type Response } from "express";
import { PrismaClient } from "@prisma/client";
import redis from "../config/redis.js";
import { type AuthRequest } from "../middleware/auth.middleware.js";


const prisma = new PrismaClient();

export const searchUsers = async (req: Request, res: Response) => {
  const query = String(req.query.query || "");
  const myId = req.user?.userId || req.user?.id;

  
  const cacheData = await redis.get(`search:${query}`);
  if (cacheData) {
    console.log("Redis theke dilam, DB te jai nai");
    res.json(JSON.parse(cacheData));
    return;
  }

  
  const users = await prisma.user.findMany({
    where: {
      name: {
        contains: query,
        mode: "insensitive",
      },
      ...(myId ? { id: { not: myId } } : {}),
    },
    select: {
      id: true,
      name: true,
      avatar: true,
    },
  });

  
  await redis.set(`search:${query}`, JSON.stringify(users), "EX", 300); // 300 = 5 min

  res.json(users);
};


export const getSuggestedUsers = async (req: Request, res: Response) => {
  try {
    const myId = req.user?.userId || req.user?.id;

    if (!myId) {
      res.status(401).json({ msg: "Unauthorized" });
      return;
    }

    const users = await prisma.user.findMany({
      where: {
        id: { not: myId }, // Ami baad
      },
      select: {
        id: true,
        name: true,
        avatar: true,
      },
      take: 10, // Khali 10 jon dekhau
    });

    res.json(users);
  } catch (err) {
    res.status(500).json({ msg: "Suggest e pera hoise" });
  }
};
