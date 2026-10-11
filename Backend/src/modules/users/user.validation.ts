import { z } from "zod";
import { paginationSchema } from "@/utils/pagination";
import type { RequestHandler } from "express";

export const userIdSchema = z.object({ id: z.string().min(1).max(200) });
export const userQuerySchema = paginationSchema.extend({
  role: z.enum(["STUDENT", "TUTOR", "ADMIN"]).optional(),
  status: z.enum(["ACTIVE", "BLOCKED", "SUSPENDED"]).optional(),
  search: z.string().trim().max(200).optional(),
});
export const userStatusSchema = z.object({
  status: z.enum(["ACTIVE", "BLOCKED", "SUSPENDED"]),
}).strict();
export const profileInputSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  phone: z.string().trim().min(6).max(30).nullable().optional(),
  image: z.url().max(2000).refine(url => url.startsWith("https://") || url.startsWith("http://"), "Use an HTTP image URL.").nullable().optional(),
  address: z.string().trim().max(500).nullable().optional(),
}).strict().refine(input => Object.keys(input).length > 0, "Provide at least one profile field.");
export type UserQuery = z.infer<typeof userQuerySchema>;
export type ProfileInput = z.infer<typeof profileInputSchema>;

export interface UserLocals {
  profileInput: ProfileInput;
}

export const validateProfileInput: RequestHandler<Record<string, string>, unknown, unknown, unknown, UserLocals> = (req, res, next) => {
  try {
    res.locals.profileInput = profileInputSchema.parse(req.body);
    next();
  } catch (error) {
    next(error);
  }
};
