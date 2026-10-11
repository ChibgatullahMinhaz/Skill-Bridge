import { prisma } from "@/lib/prisma";

export { listUsers, updateStatus } from "@/modules/users/users.service";
export { deleteReview } from "@/modules/review/review.service";

export async function getPlatformStats() {
  const [users, bookings, tutors, reviews] = await prisma.$transaction([
    prisma.user.groupBy({ by: ["role", "status"], _count: true }),
    prisma.booking.groupBy({ by: ["status"], _count: true }),
    prisma.tutorProfile.count(),
    prisma.review.count(),
  ]);
  return { users, bookings, tutors, reviews };
}
