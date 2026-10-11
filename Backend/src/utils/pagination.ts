import { z } from "zod";

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).max(100000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export type Pagination = z.infer<typeof paginationSchema>;

export function pageMeta(query: Pagination, totalCount: number) {
  return {
    page: query.page,
    limit: query.limit,
    totalCount,
    totalPages: Math.ceil(totalCount / query.limit),
    hasMore: query.page * query.limit < totalCount,
  };
}
