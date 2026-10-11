import { Router } from "express";
import { requireAuth, requireRole } from "@/middlewares/auth.middleware";
import { getBookings } from "@/modules/booking/booking.controller";
import { validateBookingQuery } from "@/modules/booking/booking.validation";
import categoryRoutes from "@/modules/category/category.routes";
import { getStats, getUsers, removeReview, updateUserStatus } from "./admin.controller";
import { validateAdminReviewId, validateAdminUsersQuery, validateAdminUserStatus } from "./admin.validation";

const routes: Router = Router();
routes.use(requireAuth, requireRole("ADMIN"));
routes.get("/users", validateAdminUsersQuery, getUsers);
routes.patch("/users/:id", validateAdminUserStatus, updateUserStatus);
routes.get("/bookings", validateBookingQuery, getBookings);
routes.get("/stats", getStats);
routes.delete("/reviews/:id", validateAdminReviewId, removeReview);
routes.use("/categories", categoryRoutes);
export default routes;
