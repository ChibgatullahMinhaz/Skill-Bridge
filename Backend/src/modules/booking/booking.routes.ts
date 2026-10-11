import { Router } from "express";
import { requireAuth, requireRole } from "@/middlewares/auth.middleware";
import { validateBookingId, validateBookingQuery, validateCreateBooking } from "./booking.validation";
import { cancelBooking, completeBooking, createBooking, getBooking, getBookings } from "./booking.controller";

const routes: Router = Router();
routes.use(requireAuth);
routes.post("/", requireRole("STUDENT"), validateCreateBooking, createBooking);
routes.get("/", validateBookingQuery, getBookings);
routes.get("/:id", validateBookingId, getBooking);
routes.patch("/:id/complete", requireRole("TUTOR"), validateBookingId, completeBooking);
routes.patch("/:id/cancel", requireRole("STUDENT"), validateBookingId, cancelBooking);
export default routes;
