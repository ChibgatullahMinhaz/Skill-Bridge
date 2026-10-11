import { prisma } from "@/lib/prisma";
import { Prisma, UserStatus } from "@/prisma/generated/prisma/client";
import ApiError from "@/errors/ApiError";
import { pageMeta } from "@/utils/pagination";
import type { TutorProfileInput, TutorQuery } from "./tutor.validation";

const publicProfile = {
  user: { select: { id: true, name: true, image: true } },
  subjects: { include: { category: { select: { id: true, name: true, slug: true } } } },
} satisfies Prisma.TutorProfileInclude;

export async function saveTutorProfile(userId: string, input: TutorProfileInput) {
  const categories = await prisma.category.count({ where: { id: { in: input.categoryIds } } });
  if (categories !== input.categoryIds.length) throw new ApiError(400, "One or more categories do not exist.");
  const { categoryIds, ...data } = input;
  return prisma.tutorProfile.upsert({
    where: { userId },
    create: { ...data, userId, subjects: { create: categoryIds.map(categoryId => ({ categoryId })) } },
    update: { ...data, subjects: { deleteMany: {}, create: categoryIds.map(categoryId => ({ categoryId })) } },
    include: publicProfile,
  });
}

export async function getMyTutorProfile(userId: string) {
  const profile = await prisma.tutorProfile.findUnique({ where: { userId }, include: publicProfile });
  if (!profile) throw new ApiError(404, "Create your tutor profile first.");
  return profile;
}

export async function getTutor(id: string) {
  const tutor = await prisma.tutorProfile.findFirst({
    where: { id, user: { status: UserStatus.ACTIVE, role: "TUTOR" } },
    include: publicProfile,
  });
  if (!tutor) throw new ApiError(404, "Tutor not found.");
  const reviews = await prisma.review.aggregate({
    where: { tutorId: id },
    _avg: { rating: true },
    _count: true,
  });
  return { ...tutor, averageRating: reviews._avg.rating ?? 0, reviewCount: reviews._count };
}

export async function listTutors(query: TutorQuery) {
  const filters: Prisma.Sql[] = [Prisma.sql`u."status" = 'ACTIVE' AND u."role" = 'TUTOR'`];
  if (query.search) {
    const search = `%${query.search}%`;
    filters.push(Prisma.sql`(u."name" ILIKE ${search} OR t."headline" ILIKE ${search} OR t."bio" ILIKE ${search}
      OR EXISTS (SELECT 1 FROM "tutorSubject" ts JOIN "category" c ON c."id" = ts."categoryId"
        WHERE ts."tutorId" = t."id" AND c."name" ILIKE ${search}))`);
  }
  if (query.categoryId) filters.push(Prisma.sql`EXISTS (SELECT 1 FROM "tutorSubject" ts WHERE ts."tutorId" = t."id" AND ts."categoryId" = ${query.categoryId})`);
  if (query.minPrice !== undefined) filters.push(Prisma.sql`t."hourlyRate" >= ${query.minPrice}`);
  if (query.maxPrice !== undefined) filters.push(Prisma.sql`t."hourlyRate" <= ${query.maxPrice}`);
  if (query.minRating !== undefined) filters.push(Prisma.sql`COALESCE(r.rating, 0) >= ${query.minRating}`);
  const orderColumn = query.sortBy === "rating" ? Prisma.sql`COALESCE(r.rating, 0)`
    : query.sortBy === "price" ? Prisma.sql`t."hourlyRate"` : Prisma.sql`t."createdAt"`;
  const direction = query.sortOrder === "asc" ? Prisma.sql`ASC` : Prisma.sql`DESC`;
  const source = Prisma.sql`FROM "tutorProfile" t JOIN "user" u ON u."id" = t."userId"
    LEFT JOIN (SELECT "tutorId", AVG("rating")::float8 AS rating, COUNT(*)::int AS count FROM "review" GROUP BY "tutorId") r ON r."tutorId" = t."id"
    WHERE ${Prisma.join(filters, " AND ")}`;
  const [rows, totals] = await prisma.$transaction([
    prisma.$queryRaw<{ id: string; averageRating: number; reviewCount: number }[]>(Prisma.sql`
      SELECT t."id", COALESCE(r.rating, 0) AS "averageRating", COALESCE(r.count, 0) AS "reviewCount"
      ${source} ORDER BY ${orderColumn} ${direction}, t."id" ASC LIMIT ${query.limit} OFFSET ${(query.page - 1) * query.limit}`),
    prisma.$queryRaw<{ count: number }[]>(Prisma.sql`SELECT COUNT(*)::int AS count ${source}`),
  ]);
  const profiles = await prisma.tutorProfile.findMany({
    where: { id: { in: rows.map(row => row.id) } },
    include: publicProfile,
  });
  const profilesById = new Map(profiles.map(profile => [profile.id, profile]));
  return {
    data: rows.map(row => {
      const profile = profilesById.get(row.id);
      if (!profile) throw new ApiError(409, "Tutor listings changed. Please retry.");
      return { ...profile, ...row };
    }),
    meta: pageMeta(query, totals[0]?.count ?? 0),
  };
}
