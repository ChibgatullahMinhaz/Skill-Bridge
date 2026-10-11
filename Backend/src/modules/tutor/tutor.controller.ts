import type { RequestHandler } from "express";
import httpStatus from "http-status";
import { requestUser } from "@/utils/requestUser";
import { sendResponse } from "@/utils/sendResponse";
import * as tutorService from "./tutor.service";
import type { TutorLocals } from "./tutor.validation";

type TutorController = RequestHandler<Record<string, string>, unknown, unknown, unknown, TutorLocals>;

export const getTutors: TutorController = async (_req, res, next) => {
  try {
    const result = await tutorService.listTutors(res.locals.tutorQuery);
    sendResponse(res, { statusCode: httpStatus.OK, success: true, ...result });
  } catch (error) {
    next(error);
  }
};

export const getTutor: TutorController = async (_req, res, next) => {
  try {
    const data = await tutorService.getTutor(res.locals.tutorId);
    sendResponse(res, { statusCode: httpStatus.OK, success: true, data });
  } catch (error) {
    next(error);
  }
};

export const getMyTutorProfile: RequestHandler = async (req, res, next) => {
  try {
    const data = await tutorService.getMyTutorProfile(requestUser(req).id);
    sendResponse(res, { statusCode: httpStatus.OK, success: true, data });
  } catch (error) {
    next(error);
  }
};

export const saveTutorProfile: TutorController = async (req, res, next) => {
  try {
    const data = await tutorService.saveTutorProfile(
      requestUser(req).id,
      res.locals.tutorProfileInput,
    );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Tutor profile saved.",
      data,
    });
  } catch (error) {
    next(error);
  }
};
