import dotenv from "dotenv";

dotenv.config();

export const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: Number(process.env.PORT) || 5000,
  DATABASE_URL: process.env.DATABASE_URL || "",
  DIRECT_URL: process.env.DIRECT_URL || "",
  APP_URL: process.env.APP_URL || "http://localhost:3000",
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET || "",
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL || "http://localhost:5000",
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || "",
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || "",
  ADMIN: {
    EMAIL: process.env.ADMIN_EMAIL || "",
    PASSWORD: process.env.ADMIN_PASSWORD || "",
    NAME: process.env.ADMIN_NAME || "Admin User",
  },
  R2: {
    REGION: process.env.R2_REGION || "auto",
    ENDPOINT: process.env.R2_ENDPOINT || "",
    ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID || "",
    SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY || "",
    BUCKET: process.env.R2_BUCKET || "",
    PRESIGNED_EXPIRES_IN: Number(process.env.R2_PRESIGNED_EXPIRES_IN) || 3600,
  },
} as const;

if (!env.DATABASE_URL && env.NODE_ENV === "production") {
  console.warn(
    "⚠️ WARNING: DATABASE_URL is not defined in environment variables!",
  );
}

if (!env.BETTER_AUTH_SECRET && env.NODE_ENV === "production") {
  console.warn(
    "⚠️ WARNING: BETTER_AUTH_SECRET is not defined in environment variables!",
  );
}
