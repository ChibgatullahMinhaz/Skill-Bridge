import { z } from "zod";
import { paginationSchema } from "@/utils/pagination";
import type { RequestHandler } from "express";

export const availabilitySlotSchema = z.object({
  startsAt: z.iso.datetime({ offset: true }).transform(value => new Date(value)),
  endsAt: z.iso.datetime({ offset: true }).transform(value => new Date(value)),
}).strict().refine(slot => slot.startsAt < slot.endsAt, "Slot end must be after its start.");

export const availabilityInputSchema = z.object({
  slots: z.array(availabilitySlotSchema).max(200),
}).strict().superRefine((input, context) => {
  const sorted = [...input.slots].sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  sorted.forEach((slot, index) => {
    if (slot.startsAt <= new Date()) context.addIssue({ code: "custom", message: "New slots must start in the future.", path: ["slots", index] });
    const previous = sorted[index - 1];
    if (previous && previous.endsAt > slot.startsAt) context.addIssue({ code: "custom", message: "Availability slots cannot overlap.", path: ["slots", index] });
  });
});

export const availabilityQuerySchema = paginationSchema.extend({
  from: z.iso.datetime({ offset: true }).transform(value => new Date(value)).optional(),
  to: z.iso.datetime({ offset: true }).transform(value => new Date(value)).optional(),
}).refine(query => !query.from || !query.to || query.from < query.to, "Invalid availability date range.");

export type AvailabilityInput = z.infer<typeof availabilityInputSchema>;
export type AvailabilityQuery = z.infer<typeof availabilityQuerySchema>;

export interface AvailabilityLocals {
  availabilityQuery: AvailabilityQuery;
  availabilityInput: AvailabilityInput;
  tutorId: string;
}

export const validateAvailabilityQuery: RequestHandler<Record<string, string>, unknown, unknown, unknown, AvailabilityLocals> = (req, res, next) => {
  try {
    res.locals.availabilityQuery = availabilityQuerySchema.parse(req.query);
    next();
  } catch (error) {
    next(error);
  }
};

export const validateAvailabilityInput: RequestHandler<Record<string, string>, unknown, unknown, unknown, AvailabilityLocals> = (req, res, next) => {
  try {
    res.locals.availabilityInput = availabilityInputSchema.parse(req.body);
    next();
  } catch (error) {
    next(error);
  }
};

export const validatePublicAvailability: RequestHandler<Record<string, string>, unknown, unknown, unknown, AvailabilityLocals> = (req, res, next) => {
  try {
    res.locals.tutorId = z.object({ id: z.string().cuid() }).parse(req.params).id;
    res.locals.availabilityQuery = availabilityQuerySchema.parse(req.query);
    next();
  } catch (error) {
    next(error);
  }
};
