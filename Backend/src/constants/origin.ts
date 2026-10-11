import { env } from "@/config/env";

export const trustedOrigins = [
  "http://localhost:5173",
  "http://localhost:4173",
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:8086",
  env.APP_URL,
].filter((origin, index, origins) => origins.indexOf(origin) === index);
