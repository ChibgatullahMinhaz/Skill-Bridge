import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma";
import { Role, UserStatus } from "@/prisma/generated/prisma/enums";
import { registrationRoleSchema } from "./auth-policy";
import { authHooks } from "./auth-hooks";
import { trustedOrigins } from "@/constants/origin";
import { env } from "@/config/env";


export const auth = betterAuth({
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  trustedOrigins,
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  databaseHooks: authHooks,
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    requireEmailVerification: false,
  },
  socialProviders: env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET ? {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    },
  } : {},
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: Role.STUDENT,
        input: true,
        validator: { input: registrationRoleSchema },
      },
      status: {
        type: "string",
        required: false,
        defaultValue: UserStatus.ACTIVE,
        input: false,
      },
    },
  },

  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
    // crossSubDomainCookies: { enabled: true },
  },
});
