import type { RequestHandler } from "express";
import httpStatus from "http-status";
import { requestUser } from "@/utils/requestUser";
import { sendResponse } from "@/utils/sendResponse";
import * as bookingService from "./booking.service";
import type { BookingLocals } from "./booking.validation";

type BookingController = RequestHandler<Record<string, string>, unknown, unknown, unknown, BookingLocals>;

export const createBooking: BookingController = async (req, res, next) => {
  try {
    const data = await bookingService.createBooking(
      requestUser(req).id,
      res.locals.bookingInput.slotId,
    );
    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: "Session confirmed.",
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const getBookings: BookingController = async (req, res, next) => {
  try {
    const result = await bookingService.listBookings(
      requestUser(req),
      res.locals.bookingQuery,
    );
    sendResponse(res, { statusCode: httpStatus.OK, success: true, ...result });
  } catch (error) {
    next(error);
  }
};

export const getBooking: BookingController = async (req, res, next) => {
  try {
    const data = await bookingService.getBooking(
      res.locals.bookingId,
      requestUser(req),
    );
    sendResponse(res, { statusCode: httpStatus.OK, success: true, data });
  } catch (error) {
    next(error);
  }
};

export const completeBooking: BookingController = async (req, res, next) => {
  try {
    const data = await bookingService.changeBookingStatus(
      res.locals.bookingId,
      requestUser(req),
      "COMPLETED",
    );
    sendResponse(res, { statusCode: httpStatus.OK, success: true, data });
  } catch (error) {
    next(error);
  }
};

export const cancelBooking: BookingController = async (req, res, next) => {
  try {
    const data = await bookingService.changeBookingStatus(
      res.locals.bookingId,
      requestUser(req),
      "CANCELLED",
    );
    sendResponse(res, { statusCode: httpStatus.OK, success: true, data });
  } catch (error) {
    next(error);
  }
};
