import type { RequestHandler } from "express";
import httpStatus from "http-status";
import { requestUser } from "@/utils/requestUser";
import { sendResponse } from "@/utils/sendResponse";
import * as availabilityService from "./availability.service";
import type { AvailabilityLocals } from "./availability.validation";

type AvailabilityController = RequestHandler<Record<string, string>, unknown, unknown, unknown, AvailabilityLocals>;

export const getMyAvailability: AvailabilityController = async (req, res, next) => {
  try {
    const result = await availabilityService.getMyAvailability(
      requestUser(req).id,
      res.locals.availabilityQuery,
    );
    sendResponse(res, { statusCode: httpStatus.OK, success: true, ...result });
  } catch (error) {
    next(error);
  }
};

export const updateAvailability: AvailabilityController = async (req, res, next) => {
  try {
    const data = await availabilityService.replaceAvailability(
      requestUser(req).id,
      res.locals.availabilityInput,
    );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Availability saved; booked slots preserved.",
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const getPublicAvailability: AvailabilityController = async (_req, res, next) => {
  try {
    const result = await availabilityService.getPublicAvailability(
      res.locals.tutorId,
      res.locals.availabilityQuery,
    );
    sendResponse(res, { statusCode: httpStatus.OK, success: true, ...result });
  } catch (error) {
    next(error);
  }
};
