import { z } from "zod";
import { paginationSchema } from "@/utils/pagination";
import type { RequestHandler } from "express";

export const tutorIdSchema = z.object({ id: z.string().cuid() });

export const tutorProfileSchema = z.object({
  headline: z.string().trim().min(3).max(150),
  bio: z.string().trim().min(10).max(5000),
  hourlyRate: z.number().finite().positive().max(99999999.99)
    .refine(value => Math.abs(value * 100 - Math.round(value * 100)) < 0.000001, "Use at most two decimal places."),
  categoryIds: z.array(z.string().cuid()).min(1).max(20)
    .refine(ids => new Set(ids).size === ids.length, "Duplicate subjects are not allowed."),
}).strict();

export const tutorQuerySchema = paginationSchema.extend({
  search: z.string().trim().max(200).optional(),
  categoryId: z.string().cuid().optional(),
  minPrice: z.coerce.number().finite().min(0).optional(),
  maxPrice: z.coerce.number().finite().min(0).optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  sortBy: z.enum(["rating", "price", "createdAt"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
}).refine(query => query.minPrice === undefined || query.maxPrice === undefined || query.minPrice <= query.maxPrice, {
  message: "Minimum price cannot exceed maximum price.",
  path: ["minPrice"],
});

export type TutorProfileInput = z.infer<typeof tutorProfileSchema>;
export type TutorQuery = z.infer<typeof tutorQuerySchema>;

export interface TutorLocals {
  tutorId: string;
  tutorQuery: TutorQuery;
  tutorProfileInput: TutorProfileInput;
}

type TutorValidation = RequestHandler<Record<string, string>, unknown, unknown, unknown, TutorLocals>;

export const validateTutorId: TutorValidation = (req, res, next) => {
  try {
    res.locals.tutorId = tutorIdSchema.parse(req.params).id;
    next();
  } catch (error) {
    next(error);
  }
};

export const validateTutorQuery: TutorValidation = (req, res, next) => {
  try {
    res.locals.tutorQuery = tutorQuerySchema.parse(req.query);
    next();
  } catch (error) {
    next(error);
  }
};

export const validateTutorProfile: TutorValidation = (req, res, next) => {
  try {
    res.locals.tutorProfileInput = tutorProfileSchema.parse(req.body);
    next();
  } catch (error) {
    next(error);
  }
};
