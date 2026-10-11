import { z } from "zod";
import { paginationSchema } from "@/utils/pagination";
import type { RequestHandler } from "express";

export const bookingIdSchema = z.object({ id: z.string().cuid() });
export const createBookingSchema = z.object({ slotId: z.string().cuid() }).strict();
export const bookingQuerySchema = paginationSchema.extend({
  status: z.enum(["CONFIRMED", "COMPLETED", "CANCELLED"]).optional(),
  period: z.enum(["upcoming", "past"]).optional(),
  studentId: z.string().min(1).optional(),
  tutorId: z.string().cuid().optional(),
});
export type BookingQuery = z.infer<typeof bookingQuerySchema>;
export type CreateBookingInput = z.infer<typeof createBookingSchema>;

export interface BookingLocals {
  bookingId: string;
  bookingQuery: BookingQuery;
  bookingInput: CreateBookingInput;
}

type BookingValidation = RequestHandler<Record<string, string>, unknown, unknown, unknown, BookingLocals>;

export const validateBookingId: BookingValidation = (req, res, next) => {
  try {
    res.locals.bookingId = bookingIdSchema.parse(req.params).id;
    next();
  } catch (error) {
    next(error);
  }
};

export const validateBookingQuery: BookingValidation = (req, res, next) => {
  try {
    res.locals.bookingQuery = bookingQuerySchema.parse(req.query);
    next();
  } catch (error) {
    next(error);
  }
};

export const validateCreateBooking: BookingValidation = (req, res, next) => {
  try {
    res.locals.bookingInput = createBookingSchema.parse(req.body);
    next();
  } catch (error) {
    next(error);
  }
};
