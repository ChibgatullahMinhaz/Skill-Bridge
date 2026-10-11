import { prisma } from "@/lib/prisma";
import { Prisma, type UserStatus } from "@/prisma/generated/prisma/client";
import ApiError from "@/errors/ApiError";
import { pageMeta } from "@/utils/pagination";
import type { ProfileInput, UserQuery } from "./user.validation";

const profileSelect = {
  id: true, name: true, email: true, emailVerified: true, role: true,
  status: true, phone: true, image: true, address: true, createdAt: true, updatedAt: true,
} satisfies Prisma.UserSelect;

export async function getProfile(id: string) {
  const user = await prisma.user.findUnique({ where: { id }, select: profileSelect });
  if (!user) throw new ApiError(404, "User not found.");
  return user;
}

export async function updateProfile(id: string, input: ProfileInput) {
  const data: Prisma.UserUpdateInput = {
    ...(input.name !== undefined && { name: input.name }),
    ...(input.phone !== undefined && { phone: input.phone }),
    ...(input.image !== undefined && { image: input.image }),
    ...(input.address !== undefined && { address: input.address }),
  };
  return prisma.user.update({ where: { id }, data, select: profileSelect });
}

export async function listUsers(query: UserQuery) {
  const where: Prisma.UserWhereInput = {
    ...(query.role && { role: query.role }), ...(query.status && { status: query.status }),
    ...(query.search && { OR: [{ name: { contains: query.search, mode: "insensitive" } }, { email: { contains: query.search, mode: "insensitive" } }] }),
  };
  const [data, count] = await prisma.$transaction([
    prisma.user.findMany({ where, select: { ...profileSelect, tutorProfile: { select: { id: true, headline: true } }, _count: { select: { bookings: true } } },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (query.page - 1) * query.limit, take: query.limit }),
    prisma.user.count({ where }),
  ]);
  return { data, meta: pageMeta(query, count) };
}

export async function updateStatus(adminId: string, id: string, status: UserStatus) {
  if (adminId === id && status !== "ACTIVE") throw new ApiError(400, "You cannot ban your own admin account.");
  return prisma.$transaction(async tx => {
    const user = await tx.user.findUnique({ where: { id }, select: { role: true } });
    if (!user) throw new ApiError(404, "User not found.");
    if (user.role === "ADMIN") throw new ApiError(403, "Admin status cannot be changed through user moderation.");
    const updated = await tx.user.update({ where: { id }, data: { status }, select: profileSelect });
    if (status !== "ACTIVE") await tx.session.deleteMany({ where: { userId: id } });
    return updated;
  });
}
