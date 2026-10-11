import type { RequestHandler } from "express";
import httpStatus from "http-status";
import { requestUser } from "@/utils/requestUser";
import { sendResponse } from "@/utils/sendResponse";
import * as usersService from "./users.service";
import type { UserLocals } from "./user.validation";

export const getMyProfile: RequestHandler = async (req, res, next) => {
  try {
    const data = await usersService.getProfile(requestUser(req).id);
    sendResponse(res, { statusCode: httpStatus.OK, success: true, data });
  } catch (error) {
    next(error);
  }
};

export const updateMyProfile: RequestHandler<Record<string, string>, unknown, unknown, unknown, UserLocals> = async (req, res, next) => {
  try {
    const data = await usersService.updateProfile(
      requestUser(req).id,
      res.locals.profileInput,
    );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Profile updated.",
      data,
    });
  } catch (error) {
    next(error);
  }
};
