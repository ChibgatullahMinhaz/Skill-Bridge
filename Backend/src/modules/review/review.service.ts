import { prisma } from "@/lib/prisma";
import ApiError from "@/errors/ApiError";
import { pageMeta, type Pagination } from "@/utils/pagination";
import type { ReviewInput } from "./review.validation";
import { getTutor } from "@/modules/tutor/tutor.service";

export async function getPublicTutorReviews(tutorId: string, query: Pagination) {
  await getTutor(tutorId);
  return getTutorReviews(tutorId, query);
}

export async function createReview(studentId: string, input: ReviewInput) {
  const booking = await prisma.booking.findUnique({ where: { id: input.bookingId } });
  if (!booking) throw new ApiError(404, "Booking not found.");
  if (booking.studentId !== studentId) throw new ApiError(403, "You can only review your own session.");
  if (booking.status !== "COMPLETED") throw new ApiError(409, "Reviews require a completed session.");
  return prisma.review.create({
    data: { ...input, tutorId: booking.tutorId },
  });
}

export async function getTutorReviews(tutorId: string, query: Pagination) {
  const where = { tutorId };
  const [data, count] = await prisma.$transaction([
    prisma.review.findMany({
      where, orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (query.page - 1) * query.limit, take: query.limit,
      select: { id: true, rating: true, comment: true, createdAt: true,
        booking: { select: { student: { select: { name: true, image: true } } } } },
    }),
    prisma.review.count({ where }),
  ]);
  return { data, meta: pageMeta(query, count) };
}

export async function deleteReview(id: string) {
  return prisma.review.delete({ where: { id } });
}
