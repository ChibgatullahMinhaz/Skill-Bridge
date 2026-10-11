import type { RequestHandler } from "express";
import httpStatus from "http-status";
import { requestUser } from "@/utils/requestUser";
import { sendResponse } from "@/utils/sendResponse";
import * as reviewService from "./review.service";
import type { ReviewLocals } from "./review.validation";

type ReviewController = RequestHandler<Record<string, string>, unknown, unknown, unknown, ReviewLocals>;

export const createReview: ReviewController = async (req, res, next) => {
  try {
    const data = await reviewService.createReview(
      requestUser(req).id,
      res.locals.reviewInput,
    );
    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: "Review submitted.",
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const getTutorReviews: ReviewController = async (_req, res, next) => {
  try {
    const result = await reviewService.getPublicTutorReviews(
      res.locals.tutorId,
      res.locals.reviewQuery,
    );
    sendResponse(res, { statusCode: httpStatus.OK, success: true, ...result });
  } catch (error) {
    next(error);
  }
};
