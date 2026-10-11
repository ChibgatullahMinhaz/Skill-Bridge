import type { Role, UserStatus } from "@/prisma/generated/prisma/enums";
import { Session, User } from "better-auth";

declare global {
  namespace Express {
    interface Request {
      user?: User & {role : Role, status: UserStatus};
      session?: Session;
    }
  }
}

export {};