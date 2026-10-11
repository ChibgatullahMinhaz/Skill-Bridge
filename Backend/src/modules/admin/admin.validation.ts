import type { RequestHandler } from "express";
import { z } from "zod";
import { userIdSchema, userQuerySchema, userStatusSchema } from "@/modules/users/user.validation";
import { reviewIdSchema } from "@/modules/review/review.validation";
import type { UserQuery } from "@/modules/users/user.validation";

export const adminUsersQuerySchema = userQuerySchema;
export const adminUserStatusSchema = z.object({
  params: userIdSchema,
  body: userStatusSchema,
});
export const adminReviewParamsSchema = reviewIdSchema;

export interface AdminLocals {
  usersQuery: UserQuery;
  userStatusInput: z.infer<typeof adminUserStatusSchema>;
  reviewId: string;
}

type AdminValidation = RequestHandler<Record<string, string>, unknown, unknown, unknown, AdminLocals>;

export const validateAdminUsersQuery: AdminValidation = (req, res, next) => {
  try {
    res.locals.usersQuery = adminUsersQuerySchema.parse(req.query);
    next();
  } catch (error) {
    next(error);
  }
};

export const validateAdminUserStatus: AdminValidation = (req, res, next) => {
  try {
    res.locals.userStatusInput = adminUserStatusSchema.parse({
      params: req.params,
      body: req.body,
    });
    next();
  } catch (error) {
    next(error);
  }
};

export const validateAdminReviewId: AdminValidation = (req, res, next) => {
  try {
    res.locals.reviewId = adminReviewParamsSchema.parse(req.params).id;
    next();
  } catch (error) {
    next(error);
  }
};
