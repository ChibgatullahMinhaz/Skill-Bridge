import { prisma } from "@/lib/prisma";
import { Prisma } from "@/prisma/generated/prisma/client";
import ApiError from "@/errors/ApiError";
import { pageMeta } from "@/utils/pagination";
import type { AvailabilityInput, AvailabilityQuery } from "./availability.validation";
import { getMyTutorProfile, getTutor } from "@/modules/tutor/tutor.service";

export async function getMyAvailability(userId: string, query: AvailabilityQuery) {
  const tutor = await getMyTutorProfile(userId);
  return listAvailability(tutor.id, query);
}

export async function getPublicAvailability(tutorId: string, query: AvailabilityQuery) {
  await getTutor(tutorId);
  return listAvailability(tutorId, query, true);
}

export async function lockTutor(tx: Prisma.TransactionClient, tutorId: string) {
  // Availability replacement and booking creation must serialize on the same tutor.
  await tx.$queryRaw`SELECT "id" FROM "tutorProfile" WHERE "id" = ${tutorId} FOR UPDATE`;
}

export async function replaceAvailability(userId: string, input: AvailabilityInput) {
  const tutor = await prisma.tutorProfile.findUnique({ where: { userId }, select: { id: true } });
  if (!tutor) throw new ApiError(404, "Create your tutor profile first.");
  return prisma.$transaction(async tx => {
    await lockTutor(tx, tutor.id);
    const existing = await tx.availabilitySlot.findMany({
      where: { tutorId: tutor.id },
      include: { _count: { select: { bookings: true } } },
    });
    const retained = existing.filter(slot => slot._count.bookings > 0);
    for (const slot of input.slots) {
      if (slot.startsAt <= new Date()) throw new ApiError(400, "New slots must start in the future.");
      for (const booked of retained) {
        const identical = slot.startsAt.getTime() === booked.startsAt.getTime() && slot.endsAt.getTime() === booked.endsAt.getTime();
        if (!identical && slot.startsAt < booked.endsAt && booked.startsAt < slot.endsAt) {
          throw new ApiError(409, "Availability overlaps a historical or reserved session. Existing booked slots cannot be moved.");
        }
      }
    }
    await tx.availabilitySlot.deleteMany({ where: { tutorId: tutor.id, bookings: { none: {} } } });
    const newSlots = input.slots.filter(slot => !retained.some(existingSlot =>
      slot.startsAt.getTime() === existingSlot.startsAt.getTime() && slot.endsAt.getTime() === existingSlot.endsAt.getTime()));
    if (newSlots.length) await tx.availabilitySlot.createMany({
      data: newSlots.map(slot => ({ tutorId: tutor.id, ...slot })),
    });
    return tx.availabilitySlot.findMany({ where: { tutorId: tutor.id }, orderBy: [{ startsAt: "asc" }, { id: "asc" }] });
  });
}

export async function listAvailability(tutorId: string, query: AvailabilityQuery, availableOnly = false) {
  const now = new Date();
  const from = availableOnly && (!query.from || query.from < now) ? now : query.from;
  const where: Prisma.AvailabilitySlotWhereInput = {
    tutorId,
    ...((from || query.to) && { startsAt: { ...(from && { gte: from }), ...(query.to && { lt: query.to }) } }),
    ...(availableOnly && { bookings: { none: { status: { in: ["CONFIRMED", "COMPLETED"] } } } }),
  };
  const [data, count] = await prisma.$transaction([
    prisma.availabilitySlot.findMany({
      where, orderBy: [{ startsAt: "asc" }, { id: "asc" }],
      skip: (query.page - 1) * query.limit, take: query.limit,
      include: { _count: { select: { bookings: { where: { status: { in: ["CONFIRMED", "COMPLETED"] } } } } } },
    }),
    prisma.availabilitySlot.count({ where }),
  ]);
  return { data, meta: pageMeta(query, count) };
}
