import type { RequestHandler } from "express";
import { catchAsync } from "@/utils/catchAsync";
import { sendResponse } from "@/utils/sendResponse";
import httpStatus from "http-status";
import * as categoryService from "./category.service";
import ApiError from "@/errors/ApiError";
import type { TGetCategoryQueryInput } from "./category.validation";

export const createCategory: RequestHandler = catchAsync(async (req, res) => {
    const result = await categoryService.createCategory(req.body, req.file);

    sendResponse(res, {
        statusCode: httpStatus.CREATED,
        success: true,
        message: "Category created successfully",
        data: result,
    });
});

export const getAllCategories: RequestHandler = catchAsync(async (req, res) => {
    const query = req.query as unknown as TGetCategoryQueryInput;
    const result = await categoryService.getAllCategories(query);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Categories fetched successfully",
        data: result,
    });
});

export const getCategoryById: RequestHandler = catchAsync(async (req, res) => {
    const { id } = req.params;
    if (!id || typeof id !== "string") throw new ApiError(httpStatus.BAD_REQUEST, "invalid ID Format !")
    const result = await categoryService.getCategoryById(id);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Category fetched successfully",
        data: result,
    });
});

export const updateCategory: RequestHandler = catchAsync(async (req, res) => {
    const { id } = req.params;
    if (!id || typeof id !== "string") throw new ApiError(httpStatus.BAD_REQUEST, "invalid ID Format !")

    const result = await categoryService.updateCategory(id, req.body, req.file);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Category updated successfully",
        data: result,
    });
});

export const deleteCategory: RequestHandler = catchAsync(async (req, res) => {
    const { id } = req.params;
    if (!id || typeof id !== "string") throw new ApiError(httpStatus.BAD_REQUEST, "invalid ID Format !")
    const result = await categoryService.deleteCategory(id);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Category deleted successfully",
        data: result,
    });
});