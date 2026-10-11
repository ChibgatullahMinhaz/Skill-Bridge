import type { Request, Response, NextFunction, RequestHandler } from "express";
import httpStatus from "http-status";
import { auth } from "../lib/auth";
import { fromNodeHeaders } from "better-auth/node";
import { catchAsync } from "@/utils/catchAsync";
import ApiError from "@/errors/ApiError";
import { UserStatus, type Role } from "@/prisma/generated/prisma/enums";
import type { User } from "better-auth";
import { prisma } from "@/lib/prisma";

async function getActiveUser(sessionUser: User) {
  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: { role: true, status: true },
  });
  if (!user) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Your account no longer exists.");
  }
  if (user.status !== UserStatus.ACTIVE) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      `Your account has been ${user.status.toLowerCase()} by the admin. Please contact support.`,
    );
  }
  return { ...sessionUser, ...user };
}

// 1. Require Auth (Only Logged-in Users)
export const requireAuth: RequestHandler = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });

  if (!session) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "You are not logged in. Please log in to get access.");
  }

  req.user = await getActiveUser(session.user);
  req.session = session.session;

  next();
});

// 2. Optional Auth (Public or Logged-in Users)
export const optionalAuth: RequestHandler = catchAsync(async (req: Request, _res: Response, next: NextFunction) => {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });
  if (session) {
    req.user = await getActiveUser(session.user);
    req.session = session.session;
  }
  next();
});

// 3. Role Guard
export const requireRole = (...allowedRoles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new ApiError(httpStatus.UNAUTHORIZED, "You are not logged in."));
    }

    const userRole = req.user.role;

    if (!allowedRoles.includes(userRole)) {
      return next(new ApiError(httpStatus.FORBIDDEN, "Forbidden: You don't have permission to perform this action."));
    }

    next();
  };
};