import { Redis, type RedisOptions }  from "ioredis";

const redisOptions: RedisOptions = {
  host: process.env.REDIS_HOST || "localhost",
  port: Number(process.env.REDIS_PORT) || 6379,
  maxRetriesPerRequest: null,
};

const redis: Redis = new Redis(redisOptions);

export default redis;