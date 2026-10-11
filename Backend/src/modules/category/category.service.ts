import httpStatus from "http-status";
import type {
  TCreateCategoryInput,
  TGetCategoryQueryInput,
  TUpdateCategoryInput,
} from "./category.validation";
import ApiError from "@/errors/ApiError";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/prisma/generated/prisma/client";
import {
  deleteFromR2,
  getPresignedDownloadUrl,
  uploadBufferToR2,
} from "@/utils/r2";
import { createCategoryStorageKey, generateSlug } from "@/utils/storageKey";

export const createCategory = async (
  payload: TCreateCategoryInput,
  file?: Express.Multer.File,
) => {
  const slug = generateSlug(payload.name);

  const isExist = await prisma.category.findFirst({
    where: {
      OR: [{ name: payload.name }, { slug }],
    },
  });

  if (isExist) {
    throw new ApiError(
      httpStatus.CONFLICT,
      "Category with this name already exists",
    );
  }
  let imageUrl: string | undefined;

  if (file) {
    const storageKey = createCategoryStorageKey(file, slug);
    imageUrl = await uploadBufferToR2(storageKey, file.buffer, file.mimetype);
  }

  return await prisma.category.create({
    data: {
      name: payload.name,
      slug,
      ...(imageUrl && { image: imageUrl }),
    },
  });
};

export const getAllCategories = async (query: TGetCategoryQueryInput) => {
  const { cursor, limit = 10, search, sortBy = "createdAt", sortOrder = "desc" } = query;

  const whereConditions: Prisma.CategoryWhereInput = {
    ...(search && {
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { slug: { contains: search, mode: "insensitive" } },
      ],
    }),
  };

  const categories = await prisma.category.findMany({
    where: whereConditions,
    take: limit + 1,
    ...(cursor && { cursor: { id: cursor } }),
    skip: cursor ? 1 : 0,
    orderBy: [{ [sortBy]: sortOrder }, { id: sortOrder }],
    include: {
      _count: {
        select: { tutorSubjects: true },
      },
    },
  });

  let nextCursor: string | null = null;

  if (categories.length > limit) {
    categories.pop();
    nextCursor = categories[categories.length - 1]?.id ?? null;
  }

  const categoriesWithPresignedUrls = await Promise.all(
    categories.map(async (category) => {
      return {
        ...category,
        image: category.image
          ? await getPresignedDownloadUrl(category.image)
          : null,
      };
    }),
  );

  return {
    meta: {
      limit,
      nextCursor,
      hasMore: !!nextCursor,
    },
    data: categoriesWithPresignedUrls,
  };
};

export const getCategoryById = async (id: string) => {
  const category = await prisma.category.findUnique({
    where: { id },
  });

  if (!category) {
    throw new ApiError(httpStatus.NOT_FOUND, "Category not found");
  }
  return {
    ...category,
    image: category.image
      ? await getPresignedDownloadUrl(category.image)
      : null,
  };
};

export const updateCategory = async (
  id: string,
  payload: TUpdateCategoryInput,
  file?: Express.Multer.File,
) => {
  const existingCategory = await prisma.category.findUnique({ where: { id } });
  if (!existingCategory) {
    throw new ApiError(httpStatus.NOT_FOUND, "Category not found");
  }

  const newSlug = payload.name ? generateSlug(payload.name) : undefined;

  if (payload.name && newSlug) {
    const isDuplicate = await prisma.category.findFirst({
      where: {
        id: { not: id },
        OR: [{ name: payload.name }, { slug: newSlug }],
      },
    });

    if (isDuplicate) {
      throw new ApiError(
        httpStatus.CONFLICT,
        "Category with this name already exists",
      );
    }
  }

  let newImageKey: string | undefined;
  if (file) {
    const storageKey = createCategoryStorageKey(
      file,
      newSlug || existingCategory.slug,
    );
    newImageKey = await uploadBufferToR2(
      storageKey,
      file.buffer,
      file.mimetype,
    );
  }
  const updateData: Prisma.CategoryUpdateInput = {};

  if (payload.name && newSlug) {
    updateData.name = payload.name;
    updateData.slug = newSlug;
  }

  if (newImageKey) {
    updateData.image = newImageKey;
  }

  try {
    const updatedCategory = await prisma.category.update({
      where: { id },
      data: updateData,
    });

    if (newImageKey && existingCategory.image) {
      await deleteFromR2(existingCategory.image).catch(error => {
        console.error("Failed to remove replaced category image:", error);
      });
    }

    return {
      ...updatedCategory,
      image: updatedCategory.image
        ? await getPresignedDownloadUrl(updatedCategory.image)
        : null,
    };
  } catch (error) {
    if (newImageKey) {
      await deleteFromR2(newImageKey).catch(cleanupError => {
        console.error("Failed to clean up category image after update failure:", cleanupError);
      });
    }
    throw error;
  }
};

export const deleteCategory = async (id: string) => {
  const category = await prisma.category.findUnique({
    where: { id },
    include: {
      _count: { select: { tutorSubjects: true } },
    },
  });

  if (!category) {
    throw new ApiError(httpStatus.NOT_FOUND, "Category not found");
  }

  if (category._count.tutorSubjects > 0) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Cannot delete category linked to tutor subjects",
    );
  }

  return await prisma.category.delete({
    where: { id },
  });
};
