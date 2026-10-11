import type { Request, Response, NextFunction, RequestHandler } from "express";
import type { ZodTypeAny } from "zod";
import { catchAsync } from "@/utils/catchAsync";

export const validateRequest = (schema: ZodTypeAny): RequestHandler =>
  catchAsync(
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const parsed = (await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
        cookies: req.cookies,
        file: req.file,
        files: req.files,
      })) as {
        body?: Record<string, any>;
        query?: Record<string, any>;
        params?: Record<string, any>;
        cookies?: Record<string, any>;
        file?: Express.Multer.File;
        files?: Express.Multer.File[];
      };

      if (parsed.body) req.body = parsed.body;
      // if (parsed.query) req.query = parsed.query;
      if (parsed.params) req.params = parsed.params;
      if (parsed.cookies) req.cookies = parsed.cookies;
      if (parsed.file) req.file = parsed.file;
      if (parsed.files) req.files = parsed.files;

      if (parsed.query) {
        Object.defineProperty(req, "query", {
          value: parsed.query,
          writable: true,
          enumerable: true,
          configurable: true,
        });
      }
      next();
    },
  );
