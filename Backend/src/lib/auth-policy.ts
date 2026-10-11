import { APIError } from "better-auth/api";
import { z } from "zod";

export const registrationRoleSchema = z.enum(["STUDENT", "TUTOR"]);

export function validateRegistrationRole(role: unknown) {
  const result = registrationRoleSchema.safeParse(role);
  if (!result.success) {
    throw new APIError("BAD_REQUEST", {
      message: "Registration role must be STUDENT or TUTOR.",
    });
  }
  return result.data;
}

export function assertRoleUnchanged(currentRole: string, requestedRole: unknown) {
  if (requestedRole !== undefined && requestedRole !== currentRole) {
    throw new APIError("FORBIDDEN", {
      message: "Your account role cannot be changed through profile updates.",
    });
  }
}
