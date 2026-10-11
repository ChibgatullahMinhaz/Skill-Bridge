import type { BetterAuthOptions } from "better-auth";
import { APIError } from "better-auth/api";
import { assertRoleUnchanged, validateRegistrationRole } from "./auth-policy";

export const authHooks = {
    user: {
      create: {
        before: async user => ({
          data: { ...user, role: validateRegistrationRole(user.role ?? "STUDENT") },
        }),
      },
      update: {
        before: async (user, context) => {
          if (user.role === undefined) return;
          const userId = context?.context.session?.user.id;
          if (!userId) throw new APIError("FORBIDDEN", { message: "Account role updates require an authenticated user." });
          const currentUser = await context?.context.internalAdapter.findUserById(userId);
          if (!currentUser) throw new APIError("UNAUTHORIZED", { message: "Account not found." });
          if (!("role" in currentUser) || typeof currentUser.role !== "string") throw new APIError("INTERNAL_SERVER_ERROR", { message: "Account role is unavailable." });
          assertRoleUnchanged(currentUser.role, user.role);
        },
      },
    },
    session: {
      create: {
        before: async (session, context) => {
          const user = await context?.context.internalAdapter.findUserById(session.userId);
          if (!user) throw new APIError("UNAUTHORIZED", { message: "Account not found." });
          if (!("status" in user) || user.status !== "ACTIVE") throw new APIError("FORBIDDEN", {
            message: "Your account is not active. Please contact the admin.",
          });
        },
      },
    },
} satisfies NonNullable<BetterAuthOptions["databaseHooks"]>;
