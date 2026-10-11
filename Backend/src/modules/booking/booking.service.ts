import { prisma } from "@/lib/prisma";
import { Prisma, type Role } from "@/prisma/generated/prisma/client";
import ApiError from "@/errors/ApiError";
import { lockTutor } from "@/modules/availability/availability.service";
import { pageMeta } from "@/utils/pagination";
import type { BookingQuery } from "./booking.validation";

export interface BookingActor { id: string; role: Role }

const bookingInclude = {
  slot: true,
  tutor: { include: { user: { select: { id: true, name: true, image: true } } } },
  student: { select: { id: true, name: true, image: true } },
  review: true,
} satisfies Prisma.BookingInclude;

export async function createBooking(studentId: string, slotId: string) {
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT "id" FROM "user" WHERE "id" = ${studentId} FOR UPDATE`;
    const slotInfo = await tx.availabilitySlot.findUnique({ where: { id: slotId }, select: { tutorId: true } });
    if (!slotInfo) throw new ApiError(404, "Availability slot not found.");
    await lockTutor(tx, slotInfo.tutorId);
    const slot = await tx.availabilitySlot.findUnique({
      where: { id: slotId }, include: { tutor: { include: { user: true } } },
    });
    if (!slot) throw new ApiError(409, "Availability changed. Choose another slot.");
    if (slot.tutor.user.status !== "ACTIVE" || slot.tutor.user.role !== "TUTOR") throw new ApiError(409, "Tutor is not available for bookings.");
    if (slot.startsAt <= new Date()) throw new ApiError(400, "Sessions must start in the future.");
    const conflict = await tx.booking.findFirst({
      where: {
        status: { in: ["CONFIRMED", "COMPLETED"] },
        slot: { startsAt: { lt: slot.endsAt }, endsAt: { gt: slot.startsAt } },
        OR: [{ tutorId: slot.tutorId }, { studentId }],
      },
    });
    if (conflict) throw new ApiError(409, "This session conflicts with an existing student or tutor booking.");
    const durationHours = new Prisma.Decimal(slot.endsAt.getTime() - slot.startsAt.getTime()).div(3600000);
    const totalPrice = slot.tutor.hourlyRate.mul(durationHours).toDecimalPlaces(2);
    if (totalPrice.lte(0) || totalPrice.gt("99999999.99")) {
      throw new ApiError(400, "Session duration and tutor rate produce an unsupported session price.");
    }
    return tx.booking.create({
      data: { studentId, tutorId: slot.tutorId, slotId, totalPrice },
      include: bookingInclude,
    });
  });
}

export async function getBooking(id: string, actor: BookingActor) {
  const booking = await prisma.booking.findUnique({ where: { id }, include: bookingInclude });
  if (!booking) throw new ApiError(404, "Booking not found.");
  if (actor.role !== "ADMIN" && booking.studentId !== actor.id && booking.tutor.userId !== actor.id) {
    throw new ApiError(403, "You can only access your own bookings.");
  }
  return booking;
}

export async function listBookings(actor: BookingActor, query: BookingQuery) {
  const where: Prisma.BookingWhereInput = {
    ...(actor.role === "STUDENT" && { studentId: actor.id }),
    ...(actor.role === "TUTOR" && { tutor: { userId: actor.id } }),
    ...(actor.role === "ADMIN" && query.studentId && { studentId: query.studentId }),
    ...(actor.role === "ADMIN" && query.tutorId && { tutorId: query.tutorId }),
    ...(query.status && { status: query.status }),
    ...(query.period === "upcoming" && { AND: [{ status: "CONFIRMED" }, { slot: { endsAt: { gt: new Date() } } }] }),
    ...(query.period === "past" && { OR: [{ status: { in: ["COMPLETED", "CANCELLED"] } }, { slot: { endsAt: { lte: new Date() } } }] }),
  };
  const [data, count] = await prisma.$transaction([
    prisma.booking.findMany({ where, include: bookingInclude, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (query.page - 1) * query.limit, take: query.limit }),
    prisma.booking.count({ where }),
  ]);
  return { data, meta: pageMeta(query, count) };
}

export async function changeBookingStatus(id: string, actor: BookingActor, status: "COMPLETED" | "CANCELLED") {
  const booking = await getBooking(id, actor);
  if (status === "COMPLETED" && (actor.role !== "TUTOR" || booking.tutor.userId !== actor.id)) throw new ApiError(403, "Only the owning tutor can complete a session.");
  if (status === "CANCELLED" && (actor.role !== "STUDENT" || booking.studentId !== actor.id)) throw new ApiError(403, "Only the owning student can cancel a session.");
  const updated = await prisma.booking.updateMany({ where: { id, status: "CONFIRMED" }, data: { status } });
  if (updated.count !== 1) throw new ApiError(409, "Only confirmed bookings can be completed or cancelled.");
  return getBooking(id, actor);
}
