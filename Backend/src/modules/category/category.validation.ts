import { z } from "zod";

export const createCategorySchema = z.object({
  body: z.object({
    name: z.string().min(2, "Category name must be at least 2 characters"),
  }),
  file: z
    .object({
      fieldname: z.string(),
      originalname: z.string(),
      encoding: z.string(),
      mimetype: z
        .string()
        .refine(
          (type) => type.startsWith("image/"),
          "Only image files are allowed",
        ),
      buffer: z.instanceof(Buffer),
      size: z.number(),
    })
    .optional(),
});

export const updateCategorySchema = z.object({
  params: z.object({
    id: z.string().cuid("Invalid Category ID"),
  }),
  body: z.object({
    name: z
      .string()
      .min(2, "Category name must be at least 2 characters")
      .optional(),
  }),
  file: z
    .object({
      fieldname: z.string(),
      originalname: z.string(),
      encoding: z.string(),
      mimetype: z
        .string()
        .refine(
          (type) => type.startsWith("image/"),
          "Only image files are allowed",
        ),
      buffer: z.instanceof(Buffer),
      size: z.number(),
    })
    .optional(),
});

export const categoryIdParamSchema = z.object({
  params: z.object({
    id: z.string().cuid("Invalid Category ID"),
  }),
});

export const getCategoryQuerySchema = z.object({
  query: z.object({
    cursor: z.string().optional(),
    limit: z
      .string()
      .optional()
      .transform((val) => (val ? Number(val) : 10))
      .pipe(z.number().int().min(1).max(100)),
    search: z.string().optional(),
    sortBy: z.enum(["name", "createdAt"]).optional().default("createdAt"),
    sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
  }),
});

// Zod Inferred Types Export
export type TGetCategoryQueryInput = z.infer<
  typeof getCategoryQuerySchema
>["query"];
export type TCreateCategoryInput = z.infer<typeof createCategorySchema>["body"];
export type TUpdateCategoryInput = z.infer<typeof updateCategorySchema>["body"];
export type TCategoryIdParamInput = z.infer<
  typeof categoryIdParamSchema
>["params"];
