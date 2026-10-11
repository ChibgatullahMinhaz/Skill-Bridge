import type { RequestHandler } from "express";
import httpStatus from "http-status";
import { requestUser } from "@/utils/requestUser";
import { sendResponse } from "@/utils/sendResponse";
import * as adminService from "./admin.service";
import type { AdminLocals } from "./admin.validation";

type AdminController = RequestHandler<Record<string, string>, unknown, unknown, unknown, AdminLocals>;

export const getUsers: AdminController = async (_req, res, next) => {
  try {
    const result = await adminService.listUsers(res.locals.usersQuery);
    sendResponse(res, { statusCode: httpStatus.OK, success: true, ...result });
  } catch (error) {
    next(error);
  }
};

export const updateUserStatus: AdminController = async (req, res, next) => {
  try {
    const { params, body } = res.locals.userStatusInput;
    const data = await adminService.updateStatus(requestUser(req).id, params.id, body.status);
    sendResponse(res, { statusCode: httpStatus.OK, success: true, data });
  } catch (error) {
    next(error);
  }
};

export const getStats: RequestHandler = async (_req, res, next) => {
  try {
    const data = await adminService.getPlatformStats();
    sendResponse(res, { statusCode: httpStatus.OK, success: true, data });
  } catch (error) {
    next(error);
  }
};

export const removeReview: AdminController = async (_req, res, next) => {
  try {
    const data = await adminService.deleteReview(res.locals.reviewId);
    sendResponse(res, { statusCode: httpStatus.OK, success: true, data });
  } catch (error) {
    next(error);
  }
};
