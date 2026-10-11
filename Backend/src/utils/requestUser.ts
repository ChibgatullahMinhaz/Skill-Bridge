import type { Request } from "express";
import ApiError from "@/errors/ApiError";

export function requestUser(req: Pick<Request, "user">) {
  if (!req.user) throw new ApiError(401, "Authentication required.");
  return req.user;
}
