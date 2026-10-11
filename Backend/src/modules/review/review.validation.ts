import { z } from "zod";
import type { RequestHandler } from "express";
import { paginationSchema, type Pagination } from "@/utils/pagination";

export const reviewInputSchema = z.object({
  bookingId: z.string().cuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().min(3).max(2000),
}).strict();
export const reviewIdSchema = z.object({ id: z.string().cuid() });
export type ReviewInput = z.infer<typeof reviewInputSchema>;

export const tutorReviewsRequestSchema = z.object({
  params: z.object({ id: z.string().cuid() }),
  query: paginationSchema,
});

export interface ReviewLocals {
  reviewInput: ReviewInput;
  tutorId: string;
  reviewQuery: Pagination;
}

type ReviewValidation = RequestHandler<Record<string, string>, unknown, unknown, unknown, ReviewLocals>;

export const validateCreateReview: ReviewValidation = (req, res, next) => {
  try {
    res.locals.reviewInput = reviewInputSchema.parse(req.body);
    next();
  } catch (error) {
    next(error);
  }
};

export const validateTutorReviews: ReviewValidation = (req, res, next) => {
  try {
    const { params, query } = tutorReviewsRequestSchema.parse({
      params: req.params,
      query: req.query,
    });
    res.locals.tutorId = params.id;
    res.locals.reviewQuery = query;
    next();
  } catch (error) {
    next(error);
  }
};
