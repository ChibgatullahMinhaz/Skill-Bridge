export interface ICursorMeta {
  limit: number;
  nextCursor?: string | null;
  prevCursor?: string | null;
  hasMore: boolean;
  totalCount?: number;
}

export interface IApiResponse<T> {
  statusCode: number;
  success: boolean;
  message?: string;
  meta?: ICursorMeta;
  data?: T | null;
}