import { Router } from "express";
import categoryRoutes from "@/modules/category/category.routes";
import userRoutes from "@/modules/users/users.routes";
import { publicTutorRoutes, tutorManagementRoutes } from "@/modules/tutor/tutor.routes";
import availabilityRoutes from "@/modules/availability/availability.routes";
import bookingRoutes from "@/modules/booking/booking.routes";
import reviewRoutes from "@/modules/review/review.routes";
import adminRoutes from "@/modules/admin/admin.routes";
import { sendResponse } from "@/utils/sendResponse";

const routes: Router = Router();
routes.get("/health", (_req, res) => {
  sendResponse(res, { statusCode: 200, success: true, message: "SkillBridge is healthy.", data: null });
});
routes.use("/users", userRoutes);
routes.use("/tutors", publicTutorRoutes);
routes.use("/tutor", tutorManagementRoutes);
routes.use("/tutor/availability", availabilityRoutes);
routes.use("/categories", categoryRoutes);
routes.use("/bookings", bookingRoutes);
routes.use("/reviews", reviewRoutes);
routes.use("/admin", adminRoutes);
export default routes;
