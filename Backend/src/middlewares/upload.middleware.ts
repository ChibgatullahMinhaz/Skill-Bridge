import path from "path";
import multer, { MulterError } from "multer";
import type { ErrorRequestHandler } from "express";
import ApiError from "../errors/ApiError";

const ALLOWED_IMAGE_MIME_TYPES = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/avif",
    "image/gif",
]);

const ALLOWED_IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif", ".gif"]);

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB per file

// mimetype alone is client-supplied and spoofable, so cross-check it against the file extension
function imageFileFilter(
    _req: unknown,
    file: Express.Multer.File,
    cb: multer.FileFilterCallback
) {
    const ext = path.extname(file.originalname).toLowerCase();

    if (!ALLOWED_IMAGE_MIME_TYPES.has(file.mimetype) || !ALLOWED_IMAGE_EXTENSIONS.has(ext)) {
        cb(new ApiError(400, "Only JPEG, PNG, WEBP, AVIF or GIF images are allowed"));
        return;
    }

    cb(null, true);
}

// shared, memory-backed instance for every image upload route (products, avatars, etc.)
export const imageUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_IMAGE_SIZE_BYTES },
    fileFilter: imageFileFilter,
});

const MULTER_ERROR_MESSAGES: Record<string, string> = {
    LIMIT_FILE_SIZE: `File too large. Maximum size is ${MAX_IMAGE_SIZE_BYTES / (1024 * 1024)}MB`,
    LIMIT_FILE_COUNT: "Too many files uploaded",
    LIMIT_UNEXPECTED_FILE: "Unexpected file field",
};

// multer throws its own error class outside the normal ApiError flow; normalize it to a 400 here
export const handleUploadErrors: ErrorRequestHandler = (err, _req, _res, next) => {
    if (err instanceof MulterError) {
        next(new ApiError(400, MULTER_ERROR_MESSAGES[err.code] ?? "File upload failed"));
        return;
    }

    next(err);
};
