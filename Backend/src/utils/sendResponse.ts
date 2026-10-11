import type { IApiResponse } from "@/types/api.types";
import type { Response } from "express";



export const sendResponse = <T>(res: Response, data: IApiResponse<T>): void => {
  res.status(data.statusCode).json({
    statusCode: data.statusCode,
    success: data.success,
    message: data.message,
    meta: data.meta,
    data: data.data ?? null,
  });
};