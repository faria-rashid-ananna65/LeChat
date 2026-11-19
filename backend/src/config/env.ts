import "dotenv/config";
import {z} from "zod";

const envSchema = z.object({
    PORT: z.string().default("3000"),
    DB_HOST: z.string().default("localhost"),
    DB_PORT: z.string().default("5432"),
    DB_NAME: z.string().default("realtime_chat"),
    DB_USER: z.string().default("postgres"),
    DB_PASSWORD: z.string().default("postgres")
});


const parse = envSchema.safeParse(process.env);

if (!parse.success) {
    process.exit(1);
}

export const env = parse.data;